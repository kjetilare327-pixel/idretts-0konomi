import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { clubId, seasonId, amount, dueDate, title, teamFilter, memberIds } = await req.json();

  if (!clubId || !seasonId || !amount || !dueDate) {
    return Response.json({ error: 'Mangler påkrevde felt: clubId, seasonId, amount, dueDate' }, { status: 400 });
  }

  // Fetch members to process
  let members;
  if (memberIds && memberIds.length > 0) {
    // Use provided member IDs
    const allMembers = await base44.asServiceRole.entities.Member.filter({ club_id: clubId, status: 'active' });
    members = allMembers.filter(m => memberIds.includes(m.id));
  } else if (teamFilter) {
    members = await base44.asServiceRole.entities.Member.filter({ club_id: clubId, status: 'active', team: teamFilter });
  } else {
    members = await base44.asServiceRole.entities.Member.filter({ club_id: clubId, status: 'active' });
  }

  // Filter to only players (not coaches/board etc unless wanted)
  const payingMembers = members.filter(m => m.membership_type === 'player');

  if (payingMembers.length === 0) {
    return Response.json({ error: 'Ingen aktive spillere funnet' }, { status: 400 });
  }

  // Check for existing unpaid requirements with the same title+season to avoid duplicates
  const existing = await base44.asServiceRole.entities.PaymentRequirement.filter({
    club_id: clubId,
    season_id: seasonId,
    category: 'membership_fees',
  });

  const existingMemberIds = new Set(existing.flatMap(p => p.member_ids || []));

  const toCreate = payingMembers.filter(m => !existingMemberIds.has(m.id));

  if (toCreate.length === 0) {
    return Response.json({ created: 0, skipped: payingMembers.length, message: 'Alle spillere har allerede et kontingentbetalingskrav for denne sesongen.' });
  }

  // Create one PaymentRequirement per member
  const created = [];
  for (const member of toCreate) {
    const req2 = await base44.asServiceRole.entities.PaymentRequirement.create({
      club_id: clubId,
      season_id: seasonId,
      title: title || `Kontingent – ${member.full_name}`,
      member_ids: [member.id],
      parent_email: member.parent_email || member.email || '',
      total_amount: amount,
      amount_paid: 0,
      status: 'pending',
      due_date: dueDate,
      category: 'membership_fees',
      reminder_count: 0,
    });
    created.push(req2);
  }

  console.log(`Generated ${created.length} payment requirements for club ${clubId}, season ${seasonId}`);

  return Response.json({
    created: created.length,
    skipped: payingMembers.length - toCreate.length,
    message: `${created.length} betalingskrav opprettet${toCreate.length < payingMembers.length ? `, ${payingMembers.length - toCreate.length} hoppet over (allerede eksisterende)` : ''}.`,
  });
});