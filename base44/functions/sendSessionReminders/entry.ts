import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ── Scheduled reminder job ──
// Runs every 5 minutes. Finds published events with reminders enabled
// that start within the configured reminder window, and sends reminders
// via the sendWorkspaceEmail function.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow test mode from admin
    let body = {};
    try { body = await req.json(); } catch (_) {}

    if (body.test_mode) {
      const user = await base44.auth.me();
      if (!user || !['admin', 'super_admin', 'event_admin'].includes(user.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Manually trigger reminder for a specific event
      const { event_id, reminder_type } = body;
      const result = await base44.asServiceRole.functions.invoke('sendWorkspaceEmail', {
        action: 'send_reminders',
        event_id,
        reminder_type: reminder_type || '24hour',
      });
      return Response.json(result);
    }

    // ── Scheduled execution ──
    const now = new Date();

    // Get all published events happening in the next 25 hours
    const tomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Fetch published events for today and tomorrow
    const allEvents = await base44.asServiceRole.entities.Event.filter({ status: 'published' });
    const relevantEvents = allEvents.filter(e => {
      if (!e.start_datetime) return false;
      const eventDate = e.event_date;
      return eventDate === todayStr || eventDate === tomorrowStr;
    });

    if (!relevantEvents.length) {
      console.log('No relevant events found for reminders.');
      return Response.json({ sent: 0 });
    }

    let totalSent = 0;

    for (const event of relevantEvents) {
      // Check if reminders are enabled (default: true if field missing)
      const remindersEnabled = event.reminder_enabled !== false;
      if (!remindersEnabled) {
        console.log(`Reminders disabled for "${event.name}", skipping.`);
        continue;
      }

      const startTime = new Date(event.start_datetime);
      const hoursUntilStart = (startTime - now) / (3600 * 1000);
      const reminderHours = event.reminder_hours_before || 24;

      // Check if we're in the right window (±15 min tolerance for 5-min scheduler)
      const toleranceMins = 15;
      const minsUntilStart = hoursUntilStart * 60;

      const remindersToSend = [];

      // Primary reminder (configurable, default 24h before)
      const primaryMins = reminderHours * 60;
      if (minsUntilStart >= (primaryMins - toleranceMins) && minsUntilStart <= (primaryMins + toleranceMins)) {
        remindersToSend.push('24hour');
      }

      // 1-hour reminder (always if enabled)
      if (minsUntilStart >= (60 - toleranceMins) && minsUntilStart <= (60 + toleranceMins)) {
        remindersToSend.push('1hour');
      }

      if (!remindersToSend.length) continue;

      for (const reminderType of remindersToSend) {
        console.log(`Sending ${reminderType} reminder for "${event.name}" (${event.id})`);
        try {
          const result = await base44.asServiceRole.functions.invoke('sendWorkspaceEmail', {
            action: 'send_reminders',
            event_id: event.id,
            reminder_type: reminderType,
          });
          totalSent += result.sent || 0;
          console.log(`✓ ${reminderType} reminder for "${event.name}": ${result.sent} emails sent`);
        } catch (err) {
          console.error(`✗ Failed ${reminderType} reminder for "${event.name}":`, err.message);
        }
      }
    }

    console.log(`Reminder job complete. Total emails sent: ${totalSent}`);
    return Response.json({ sent: totalSent });
  } catch (error) {
    console.error("sendSessionReminders error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});