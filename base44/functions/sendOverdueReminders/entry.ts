import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin-triggered and scheduled (service role) calls
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all clubs
    const allSettings = await base44.asServiceRole.entities.AutomationSettings.filter({});

    let totalSent = 0;
    let totalSkipped = 0;

    for (const settings of allSettings) {
      if (!settings.auto_reminder_enabled) continue;

      const firstDays = settings.first_reminder_days || 7;
      const repeatDays = settings.repeat_reminder_days || 7;
      const clubId = settings.club_id;

      // Get club info for email sender name
      const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
      const club = clubs[0];
      if (!club) continue;

      // Get all unpaid payments for this club
      const payments = await base44.asServiceRole.entities.PaymentRequirement.filter({ club_id: clubId });
      const unpaid = payments.filter(p => p.status !== 'paid' && p.due_date);

      for (const payment of unpaid) {
        const dueDate = new Date(payment.due_date);
        const daysPast = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        if (daysPast < firstDays) continue;

        // Check if enough time has passed since last reminder
        if (payment.last_reminder_date) {
          const lastReminder = new Date(payment.last_reminder_date);
          const daysSince = Math.floor((today - lastReminder) / (1000 * 60 * 60 * 24));
          if (daysSince < repeatDays) {
            totalSkipped++;
            continue;
          }
        }

        // Determine recipient email
        const recipientEmail = payment.parent_email;
        if (!recipientEmail) {
          // Try to find parent email from linked members
          const memberIds = payment.member_ids || [];
          let foundEmail = null;
          for (const mid of memberIds) {
            const members = await base44.asServiceRole.entities.Member.filter({ id: mid });
            const m = members[0];
            if (m?.parent_email) { foundEmail = m.parent_email; break; }
            if (m?.email) { foundEmail = m.email; break; }
          }
          if (!foundEmail) { totalSkipped++; continue; }
          // Send to found email
          await sendReminderEmail(base44, foundEmail, payment, club, daysPast);
        } else {
          await sendReminderEmail(base44, recipientEmail, payment, club, daysPast);
        }

        // Update reminder count and date
        await base44.asServiceRole.entities.PaymentRequirement.update(payment.id, {
          reminder_count: (payment.reminder_count || 0) + 1,
          last_reminder_date: todayStr,
        });

        totalSent++;
        console.log(`Reminder sent for payment ${payment.id} to ${recipientEmail || 'member email'}`);
      }
    }

    console.log(`sendOverdueReminders done: ${totalSent} sent, ${totalSkipped} skipped`);
    return Response.json({ ok: true, sent: totalSent, skipped: totalSkipped });

  } catch (error) {
    console.error('sendOverdueReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function sendReminderEmail(base44, toEmail, payment, club, daysPast) {
  const remaining = payment.total_amount - (payment.amount_paid || 0);
  const formattedAmount = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(remaining);
  const formattedDue = new Date(payment.due_date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

  const subject = `Påminnelse: Ubetalt krav – ${payment.title}`;

  const body = `Hei,

Dette er en påminnelse om at følgende betalingskrav fremdeles ikke er betalt:

Tittel: ${payment.title}
Beløp: ${formattedAmount}
Forfallsdato: ${formattedDue}
Dager siden forfall: ${daysPast}

Vennligst gjennomfør betalingen så snart som mulig.

${payment.description ? `Merknad: ${payment.description}\n\n` : ''}Har du spørsmål? Ta kontakt med ${club.name}${club.contact_email ? ` på ${club.contact_email}` : ''}.

Med vennlig hilsen,
${club.name}`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    from_name: club.name,
    to: toEmail,
    subject,
    body,
  });
}