import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Workspace-scoped Zoom integration ──
// Resolves Zoom credentials from WorkspaceIntegration or WorkspaceSetting.
// Supports webinar + meeting creation, panelist management.
// Architecture note: This function uses S2S OAuth. Future migration to per-user OAuth
// would replace getZoomToken with a connector-based flow.

async function getZoomToken(base44, workspaceId) {
  // Try WorkspaceIntegration first
  const integrations = await base44.asServiceRole.entities.WorkspaceIntegration.filter({ workspace_id: workspaceId, provider: 'zoom', status: 'active' });
  let accountId, clientId, clientSecret;

  if (integrations.length && integrations[0].credentials_json_encrypted) {
    try {
      const creds = JSON.parse(integrations[0].credentials_json_encrypted);
      accountId = creds.account_id; clientId = creds.client_id; clientSecret = creds.client_secret;
    } catch (_) {}
  }

  // Fallback to WorkspaceSetting
  if (!accountId) {
    const settings = await base44.asServiceRole.entities.WorkspaceSetting.filter({ workspace_id: workspaceId });
    const settingMap = Object.fromEntries(settings.map(s => [s.key, s.value_json]));
    const parse = (v) => { try { return JSON.parse(v); } catch { return v; } };
    accountId = parse(settingMap['zoom_account_id']); clientId = parse(settingMap['zoom_client_id']); clientSecret = parse(settingMap['zoom_client_secret']);
  }

  // Global fallback
  if (!accountId) { accountId = Deno.env.get('ZOOM_ACCOUNT_ID'); clientId = Deno.env.get('ZOOM_CLIENT_ID'); clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET'); }

  if (!accountId || !clientId || !clientSecret) throw new Error('Zoom not configured for this workspace');

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const tokenRes = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${credentials}` },
    body: `grant_type=account_credentials&account_id=${accountId}`,
  });

  if (!tokenRes.ok) throw new Error(`Zoom token error: ${tokenRes.status}`);
  return (await tokenRes.json()).access_token;
}

async function createZoomSession(accessToken, event, type) {
  const startDt = new Date(event.start_datetime || `${event.event_date}T09:00:00`);
  const endDt = event.end_datetime ? new Date(event.end_datetime) : null;
  const durationMins = Math.max(120, (endDt ? Math.round((endDt - startDt) / 60000) : 60) + 60);
  const tz = event.timezone || 'Australia/Brisbane';
  const localStart = startDt.toLocaleString('sv-SE', { timeZone: tz }).replace(' ', 'T');

  const isWebinar = type === 'webinar';
  const endpoint = isWebinar ? 'https://api.zoom.us/v2/users/me/webinars' : 'https://api.zoom.us/v2/users/me/meetings';
  const payload = {
    topic: event.name, type: isWebinar ? 5 : 2, start_time: localStart, duration: durationMins, timezone: tz,
    agenda: event.description || '',
    settings: {
      ...(isWebinar ? { approval_type: 0, registration_type: 1 } : { join_before_host: true, waiting_room: false }),
      host_video: true, ...(isWebinar ? { panelists_video: true } : { participant_video: false }),
      registrants_email_notification: false, registrants_confirmation_email: false,
      allow_multiple_devices: true,
      question_and_answer: { enable: true, allow_submit_questions: true, allow_anonymous_questions: false },
    },
  };

  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }, body: JSON.stringify(payload) });
  if (!res.ok) { const err = await res.text(); throw new Error(`Zoom create ${type} failed: ${res.status} ${err}`); }
  const data = await res.json();

  // Simplify registration questions for webinars
  if (isWebinar) {
    await fetch(`https://api.zoom.us/v2/webinars/${data.id}/registrants/questions`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ questions: [{ field_name: 'last_name', required: true }], custom_questions: [] }),
    }).catch(() => {});
  }

  return { id: String(data.id), join_url: data.join_url, registration_url: data.registration_url || data.join_url, start_url: data.start_url };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, workspace_id, event_id } = body;

    // ── Create webinar/meeting for event ──
    if (action === 'create_session') {
      const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
      if (!events.length) return Response.json({ error: 'Event not found' }, { status: 404 });
      const event = events[0];
      const wsId = workspace_id || event.workspace_id;
      const accessToken = await getZoomToken(base44, wsId);
      const zoomType = body.zoom_type || 'webinar';
      const session = await createZoomSession(accessToken, event, zoomType);

      // Save to event
      await base44.asServiceRole.entities.Event.update(event_id, {
        zoom_link: session.registration_url,
        zoom_meeting_id: zoomType === 'meeting' ? session.id : '',
        zoom_webinar_id: zoomType === 'webinar' ? session.id : '',
      });

      return Response.json({ status: 'success', ...session });
    }

    // ── Add panelist ──
    if (action === 'add_panelist') {
      const { webinar_id, name, email } = body;
      const accessToken = await getZoomToken(base44, workspace_id);
      const res = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/panelists`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ panelists: [{ name, email }] }),
      });
      if (!res.ok) { const err = await res.text(); throw new Error(`Add panelist failed: ${err}`); }
      return Response.json({ status: 'success' });
    }

    // ── Remove panelist ──
    if (action === 'remove_panelist') {
      const { webinar_id, panelist_id } = body;
      const accessToken = await getZoomToken(base44, workspace_id);
      await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/panelists/${panelist_id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      return Response.json({ status: 'success' });
    }

    // ── List panelists ──
    if (action === 'list_panelists') {
      const { webinar_id } = body;
      const accessToken = await getZoomToken(base44, workspace_id);
      const res = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/panelists`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`List panelists failed: ${res.status}`);
      const data = await res.json();
      return Response.json({ status: 'success', panelists: data.panelists || [] });
    }

    // ── Publish guardrail check ──
    if (action === 'check_publish_ready') {
      const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
      if (!events.length) return Response.json({ error: 'Event not found' }, { status: 404 });
      const event = events[0];
      const warnings = [];

      if (['online_stream', 'hybrid'].includes(event.event_mode) && !event.zoom_link && event.zoom_mode !== 'none') {
        warnings.push({ level: 'error', message: 'Online/hybrid event requires Zoom link. Create a webinar first or set Zoom Mode to "none".' });
      }
      if (['in_person', 'hybrid'].includes(event.event_mode) && !event.venue_id && !event.venue_details) {
        warnings.push({ level: 'warning', message: 'No venue assigned for in-person event.' });
      }
      const tts = await base44.asServiceRole.entities.TicketType.filter({ event_id, is_active: true });
      if (!tts.length) warnings.push({ level: 'error', message: 'No active ticket types configured.' });

      return Response.json({ status: 'success', ready: !warnings.some(w => w.level === 'error'), warnings });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('zoomWorkspace error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});