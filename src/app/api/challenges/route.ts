import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ── GET /api/challenges?slotId=… ────────────────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get('slotId');
  if (!slotId) return NextResponse.json({ error: 'slotId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('challenges')
    .select(`
      id, status, created_at,
      challenger_team_id,
      teams!challenges_challenger_team_id_fkey ( id, name, elo, wins, losses, draws, total_matches )
    `)
    .eq('slot_id', slotId)
    .eq('status', 'open')
    .single();

  if (error || !data) return NextResponse.json(null);

  const team = (data as Record<string, unknown>).teams as Record<string, unknown> | null;
  return NextResponse.json({
    id:           data.id,
    status:       data.status,
    createdAt:    data.created_at,
    challengerTeam: team ? {
      id:           team.id,
      name:         team.name,
      elo:          team.elo,
      wins:         team.wins,
      losses:       team.losses,
      draws:        team.draws,
      totalMatches: team.total_matches,
    } : null,
  });
}
