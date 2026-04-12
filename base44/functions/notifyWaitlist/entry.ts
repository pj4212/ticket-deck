import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, entry_ids, event_id, ticket_type_id } = await req.json();

    if (action === 'notify_selected') {
      // Notify specific waitlist entries
      if (!entry_ids?.length) return Response.json({ error: 'No entries selected' }, { status: 400 });

      let notified = 0;
      for (const entryId of entry_ids) {
        const entries = await base44.asServiceRole.entities.WaitlistEntry.filter({ id: entryId });
        if (!entries.length) continue;
        const entry = entries[0];
        if (entry.status !== 'waiting') continue;

        // Load event
        const events = await base44.asServiceRole.entities.Event.filter({ id: entry.event_id });
        if (!events.length) continue;
        const event = events[0];

        const ticketInfo = entry.ticket_type_id
          ? (await base44.asServiceRole.entities.TicketType.filter({ id: entry.ticket_type_id }))?.[0]?.name || 'General'
          : 'General';

        // Send notification email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: entry.email,
          subject: `Spots Available — ${event.name}`,
          body: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
            <div style="background:#0f172a;padding:24px;text-align:center;color:white">
              <h1 style="margin:0;font-size:20px">Good News! 🎉</h1>
            </div>
            <div style="padding:24px">
              <p>Hi <strong>${entry.name}</strong>,</p>
              <p>Great news — spots have opened up for <strong>${event.name}</strong>${ticketInfo !== 'General' ? ` (${ticketInfo})` : ''}!</p>
              <p>Hurry — spots are limited and available on a first-come, first-served basis.</p>
              <p style="text-align:center;margin:24px 0">
                <a href="https://ticket-deck.com/event/${event.slug}" 
                   style="background:#4f6df5;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
                  Book Now
                </a>
              </p>
            </div>
          </div>`,
          from_name: 'Ticket Deck',
        });

        await base44.asServiceRole.entities.WaitlistEntry.update(entryId, {
          status: 'notified',
          notified_at: new Date().toISOString(),
        });
        notified++;
      }

      return Response.json({ success: true, notified });
    }

    if (action === 'notify_all') {
      // Notify all waiting entries for an event (optionally filtered by ticket type)
      if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

      const filter = { event_id, status: 'waiting' };
      if (ticket_type_id) filter.ticket_type_id = ticket_type_id;

      const entries = await base44.asServiceRole.entities.WaitlistEntry.filter(filter);
      if (!entries.length) return Response.json({ success: true, notified: 0 });

      // Delegate to notify_selected
      const result = await base44.asServiceRole.functions.invoke('notifyWaitlist', {
        action: 'notify_selected',
        entry_ids: entries.map(e => e.id),
      });

      return Response.json(result.data || result);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('notifyWaitlist error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});