import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const allRecurring = await base44.asServiceRole.entities.RecurringPayment.filter({ status: 'active' });

    const created = [];
    const reminded = [];

    for (const rp of allRecurring) {
      if (!rp.next_due_date) continue;

      // Create payment requirements when due date has arrived
      if (rp.next_due_date <= today) {
        const memberIds = rp.member_ids || [];
        for (const memberId of memberIds) {
          await base44.asServiceRole.entities.PaymentRequirement.create({
            club_id: rp.club_id,
            title: rp.title,
            description: rp.description || '',
            total_amount: rp.amount,
            amount_paid: 0,
            status: 'pending',
            due_date: rp.next_due_date,
            category: rp.category || 'membership_fees',
            member_ids: [memberId],
          });
        }

        // Advance next_due_date
        const next = advanceDate(rp.next_due_date, rp.frequency);
        await base44.asServiceRole.entities.RecurringPayment.update(rp.id, {
          last_run_date: today,
          next_due_date: next,
          reminder_sent: false,
        });

        created.push(rp.id);
      }

      // Send reminder 7 days before due date
      else if (rp.next_due_date === in7Days && !rp.reminder_sent) {
        // Mark reminder as sent (actual email sending would require email integration)
        await base44.asServiceRole.entities.RecurringPayment.update(rp.id, {
          reminder_sent: true,
        });
        reminded.push(rp.id);
      }
    }

    return Response.json({ ok: true, created: created.length, reminded: reminded.length });
  } catch (error) {
    console.error('processRecurringPayments error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr);
  switch (frequency) {
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'biannual':  d.setMonth(d.getMonth() + 6); break;
    case 'annual':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}