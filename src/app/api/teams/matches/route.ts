import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get user's team
  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('owner_user_id', user.id)
    .single();

  if (!team) return NextResponse.json([]);

  // Fetch all challenges involving this team
  const { data: challenges, error } = await supabaseAdmin
    .from('challenges')
    .select(`
      id, status, created_at,
      challenger_team_id, opponent_team_id,
      slots ( date, start_time, end_time ),
      fields ( name_ar, location_ar ),
      challenger:teams!challenges_challenger_team_id_fkey ( id, name, elo ),
      opponent:teams!challenges_opponent_team_id_fkey ( id, name, elo ),
      match_results ( id, challenger_score, opponent_score, is_draw, winner_team_id,
                      challenger_confirmed, opponent_confirmed, elo_applied,
                      challenger_peer_rating, opponent_peer_rating )
    `)
    .or(`challenger_team_id.eq.${team.id},opponent_team_id.eq.${team.id}`)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (challenges ?? []).map(c => {
    const d = c as Record<string, unknown>;
    const slot  = d.slots  as Record<string, unknown> | null;
    const field = d.fields as Record<string, unknown> | null;
    const mr    = Array.isArray(d.match_results)
      ? (d.match_results as Record<string, unknown>[])[0] ?? null
      : (d.match_results as Record<string, unknown> | null);

    const isChallenger = d.challenger_team_id === team.id;

    return {
      id:      d.id,
      status:  d.status,
      isChallenger,
      slot:  slot  ? { date: slot.date, startTime: (slot.start_time as string).slice(0,5), endTime: (slot.end_time as string).slice(0,5) } : null,
      field: field ? { nameAr: field.name_ar, locationAr: field.location_ar } : null,
      challenger: (d.challenger as Record<string, unknown> | null),
      opponent:   (d.opponent   as Record<string, unknown> | null),
      matchResult: mr ? {
        challengerScore:    mr.challenger_score,
        opponentScore:      mr.opponent_score,
        isDraw:             mr.is_draw,
        winnerTeamId:       mr.winner_team_id,
        challengerConfirmed: mr.challenger_confirmed,
        opponentConfirmed:   mr.opponent_confirmed,
        eloApplied:         mr.elo_applied,
        challengerPeerRating: mr.challenger_peer_rating,
        opponentPeerRating:   mr.opponent_peer_rating,
      } : null,
    };
  });

  return NextResponse.json(rows);
}
