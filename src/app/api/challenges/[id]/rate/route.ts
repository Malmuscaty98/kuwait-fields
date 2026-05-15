import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rating } = await req.json();
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return NextResponse.json({ error: 'التقييم يجب أن يكون بين ١ و١٠' }, { status: 400 });
  }

  const { data: challenge } = await supabaseAdmin
    .from('challenges')
    .select('id, status, challenger_team_id, opponent_team_id')
    .eq('id', id)
    .single();

  if (!challenge || challenge.status !== 'completed') {
    return NextResponse.json({ error: 'المباراة لم تنته بعد' }, { status: 400 });
  }

  const { data: userTeam } = await supabaseAdmin
    .from('teams').select('id').eq('owner_user_id', user.id).single();

  const isChallengerSide = userTeam?.id === challenge.challenger_team_id;
  const isOpponentSide   = userTeam?.id === challenge.opponent_team_id;
  if (!isChallengerSide && !isOpponentSide) {
    return NextResponse.json({ error: 'أنت لست طرفاً في هذا التحدي' }, { status: 403 });
  }

  const patch = isChallengerSide
    ? { challenger_peer_rating: rating }
    : { opponent_peer_rating: rating };

  const { error } = await supabaseAdmin
    .from('match_results').update(patch).eq('challenge_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
