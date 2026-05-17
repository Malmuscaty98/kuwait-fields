import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  // Admin only
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch all teams that have participated in at least one challenge
  // (either as challenger or opponent, status != open/cancelled)
  const { data: challenges, error } = await supabaseAdmin
    .from('challenges')
    .select(`
      id, status, created_at,
      challenger_team_id, opponent_team_id,
      match_results ( winner_team_id, is_draw, elo_applied,
                      challenger_peer_rating, opponent_peer_rating )
    `)
    .in('status', ['accepted', 'completed']);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Collect all team IDs that participated
  const teamIds = new Set<string>();
  for (const c of challenges ?? []) {
    if (c.challenger_team_id) teamIds.add(c.challenger_team_id);
    if (c.opponent_team_id)   teamIds.add(c.opponent_team_id);
  }

  if (teamIds.size === 0) return NextResponse.json([]);

  // Fetch full team records
  const { data: teams } = await supabaseAdmin
    .from('teams')
    .select('id, name, elo, wins, losses, draws, total_matches, created_at, owner_user_id')
    .in('id', [...teamIds])
    .order('elo', { ascending: false });

  // Fetch owner emails from profiles
  const ownerIds = (teams ?? []).map(t => t.owner_user_id as string);
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, email')
    .in('user_id', ownerIds);

  const profileMap: Record<string, { fullName: string; email: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.user_id as string] = {
      fullName: p.full_name as string,
      email:    p.email as string,
    };
  }

  // Compute avg peer rating received per team
  const peerRatings: Record<string, number[]> = {};
  for (const c of challenges ?? []) {
    const mr = Array.isArray(c.match_results)
      ? c.match_results[0]
      : c.match_results;
    if (!mr || !mr.elo_applied) continue;

    // challenger received opponent's peer rating
    if (c.challenger_team_id && mr.opponent_peer_rating !== null) {
      peerRatings[c.challenger_team_id] = [...(peerRatings[c.challenger_team_id] ?? []), mr.opponent_peer_rating as number];
    }
    // opponent received challenger's peer rating
    if (c.opponent_team_id && mr.challenger_peer_rating !== null) {
      peerRatings[c.opponent_team_id] = [...(peerRatings[c.opponent_team_id] ?? []), mr.challenger_peer_rating as number];
    }
  }

  const result = (teams ?? []).map((t, idx) => {
    const owner = profileMap[t.owner_user_id as string];
    const ratings = peerRatings[t.id as string] ?? [];
    const avgPeerRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    return {
      rank:           idx + 1,
      id:             t.id,
      name:           t.name,
      elo:            t.elo,
      wins:           t.wins,
      losses:         t.losses,
      draws:          t.draws,
      totalMatches:   t.total_matches,
      avgPeerRating,
      ownerName:      owner?.fullName ?? '—',
      ownerEmail:     owner?.email ?? '—',
      createdAt:      t.created_at,
    };
  });

  return NextResponse.json(result);
}
