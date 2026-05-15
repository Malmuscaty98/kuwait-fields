import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('challenges')
    .select(`
      id, status, created_at,
      slot_id, field_id,
      challenger_team_id, opponent_team_id,
      slots ( date, start_time, end_time ),
      fields ( name_ar, location_ar, image_url, price_per_hour, size ),
      challenger:teams!challenges_challenger_team_id_fkey ( id, name, elo, wins, losses, draws, total_matches ),
      opponent:teams!challenges_opponent_team_id_fkey ( id, name, elo, wins, losses, draws, total_matches )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const d = data as Record<string, unknown>;
  const slot  = d.slots  as Record<string, unknown> | null;
  const field = d.fields as Record<string, unknown> | null;

  function teamShape(t: Record<string, unknown> | null) {
    if (!t) return null;
    return { id: t.id, name: t.name, elo: t.elo, wins: t.wins, losses: t.losses, draws: t.draws, totalMatches: t.total_matches };
  }

  return NextResponse.json({
    id:          d.id,
    status:      d.status,
    createdAt:   d.created_at,
    slotId:      d.slot_id,
    fieldId:     d.field_id,
    slot:  slot  ? { date: slot.date,  startTime: (slot.start_time as string).slice(0,5), endTime: (slot.end_time as string).slice(0,5) } : null,
    field: field ? { nameAr: field.name_ar, locationAr: field.location_ar, imageUrl: field.image_url, pricePerHour: field.price_per_hour, size: field.size } : null,
    challengerTeam: teamShape(d.challenger as Record<string, unknown> | null),
    opponentTeam:   teamShape(d.opponent   as Record<string, unknown> | null),
  });
}
