import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Slot } from '@/lib/types';

function dbToSlot(
  row: Record<string, unknown>,
  challengeMap: Record<string, { id: string; teamName: string; teamElo: number }>
): Slot {
  const bookings = row.bookings as { id: string; status: string }[] | undefined;
  const activeBooking = bookings?.find(b => b.status === 'confirmed' || b.status === 'done' || b.status === 'pending');
  const challenge = challengeMap[row.id as string];

  return {
    id:        row.id as string,
    fieldId:   row.field_id as string,
    date:      row.date as string,
    startTime: (row.start_time as string).slice(0, 5),
    endTime:   (row.end_time as string).slice(0, 5),
    isOpen:    row.is_open as boolean,
    bookingId: activeBooking?.id ?? undefined,
    // Challenge info (slot appears orange/amber to other users)
    challengeId:       challenge?.id,
    challengeTeamName: challenge?.teamName,
    challengeTeamElo:  challenge?.teamElo,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get('fieldId');
  const date    = searchParams.get('date');

  let query = supabaseAdmin
    .from('slots')
    .select('id, field_id, date, start_time, end_time, is_open, bookings(id, status)')
    .order('start_time');

  if (fieldId) query = query.eq('field_id', fieldId);
  if (date)    query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Fetch open challenges for returned slots in one query
  const slotIds = rows.map(r => r.id as string);
  const challengeMap: Record<string, { id: string; teamName: string; teamElo: number }> = {};

  if (slotIds.length > 0) {
    const { data: challenges } = await supabaseAdmin
      .from('challenges')
      .select('id, slot_id, challenger_team_id, teams!challenges_challenger_team_id_fkey(name, elo)')
      .in('slot_id', slotIds)
      .eq('status', 'open');

    for (const c of challenges ?? []) {
      const team = (c as Record<string, unknown>).teams as { name: string; elo: number } | null;
      if (team) {
        challengeMap[c.slot_id as string] = {
          id:       c.id as string,
          teamName: team.name,
          teamElo:  team.elo,
        };
      }
    }
  }

  return NextResponse.json(rows.map(r => dbToSlot(r as Record<string, unknown>, challengeMap)));
}
