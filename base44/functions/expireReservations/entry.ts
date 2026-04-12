import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Scheduled function: runs every 5 minutes to expire stale inventory reservations
// and clean up abandoned checkout drafts

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin caller for manual invocations
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin' && user.role !== 'platform_admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      // May be called by scheduler without auth — allow
    }

    const now = new Date().toISOString();
    let expiredCount = 0;
    let draftsCancelled = 0;

    // 1. Find active reservations that have expired
    const activeReservations = await base44.asServiceRole.entities.InventoryReservation.filter({ status: 'active' });
    const expired = activeReservations.filter(r => r.expires_at && r.expires_at < now);

    for (const reservation of expired) {
      // Release the reservation
      await base44.asServiceRole.entities.InventoryReservation.update(reservation.id, { status: 'expired' });

      // Decrement quantity_reserved on ticket type
      const tts = await base44.asServiceRole.entities.TicketType.filter({ id: reservation.ticket_type_id });
      if (tts.length) {
        const tt = tts[0];
        await base44.asServiceRole.entities.TicketType.update(tt.id, {
          quantity_reserved: Math.max(0, (tt.quantity_reserved || 0) - reservation.reserved_quantity),
        });
      }
      expiredCount++;
    }

    // 2. Find checkout drafts that have expired but are still in draft/submitted status
    const allDrafts = await base44.asServiceRole.entities.CheckoutDraft.filter({ status: 'draft' });
    const allSubmitted = await base44.asServiceRole.entities.CheckoutDraft.filter({ status: 'submitted' });
    const staleDrafts = [...allDrafts, ...allSubmitted].filter(d => d.expires_at && d.expires_at < now);

    for (const draft of staleDrafts) {
      await base44.asServiceRole.entities.CheckoutDraft.update(draft.id, { status: 'expired' });

      // Cancel any associated order items still in draft/reserved status
      const items = await base44.asServiceRole.entities.OrderItem.filter({ checkout_draft_id: draft.id });
      for (const item of items) {
        if (item.item_status === 'draft' || item.item_status === 'reserved') {
          await base44.asServiceRole.entities.OrderItem.update(item.id, { item_status: 'cancelled' });
        }
      }

      // If there's a pending order, mark it failed
      const orders = await base44.asServiceRole.entities.Order.filter({ checkout_draft_id: draft.id });
      for (const order of orders) {
        if (order.payment_status === 'pending') {
          await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'failed' });
        }
      }

      draftsCancelled++;
    }

    console.log(`Reservation cleanup: ${expiredCount} reservations expired, ${draftsCancelled} drafts cancelled`);

    return Response.json({
      expired_reservations: expiredCount,
      cancelled_drafts: draftsCancelled,
    });
  } catch (error) {
    console.error("expireReservations error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});