import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calcElo } from '@/lib/elo';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { challengerScore, opponentScore } = await req.json();

  if (typeof challengerScore !== 'number' || typeof opponentScore !== 'number' ||
      challengerScore < 0 || opponentScore < 0 || challengerScore > 99 || opponentScore > 99) {
    return NextResponse.json({ error: 'نتيجة غير صحيحة' }, { status: 400 });
  }

  // Load challenge
  const { data: challenge } = await supabaseAdmin
    .from('challenges')
    .select('id, status, challenger_team_id, opponent_team_id')
    .eq('id', id)
    .single();

  if (!challenge || challenge.status !== 'accepted') {
    return NextResponse.json({ error: 'التحدي غير صالح' }, { status: 404 });
  }

  // Determine which side the user is on
  const { data: userTeam } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('owner_user_id', user.id)
    .single();

  const isChallengerSide = userTeam?.id === challenge.challenger_team_id;
  const isOpponentSide   = userTeam?.id === challenge.opponent_team_id;
  if (!isChallengerSide && !isOpponentSide) {
    return NextResponse.json({ error: 'أنت لست طرفاً في هذا التحدي' }, { status: 403 });
  }

  // Load existing match result record
  const { data: mr } = await supabaseAdmin
    .from('match_results')
    .select('*')
    .eq('challenge_id', id)
    .single();

  if (!mr) return NextResponse.json({ error: 'سجل المباراة غير موجود' }, { status: 404 });
  if (mr.elo_applied) return NextResponse.json({ error: 'تم تسجيل النتيجة بالفعل' }, { status: 409 });

  const isDraw = challengerScore === opponentScore;
  const winnerId = isDraw ? null :
    challengerScore > opponentScore ? challenge.challenger_team_id : challenge.opponent_team_id;

  // Update result + mark confirming side
  const patch: Record<string, unknown> = {
    challenger_score: challengerScore,
    opponent_score:   opponentScore,
    is_draw:          isDraw,
    winner_team_id:   winnerId,
  };
  if (isChallengerSide) patch.challenger_confirmed = true;
  if (isOpponentSide)   patch.opponent_confirmed   = true;

  const { data: updated, error: upErr } = await supabaseAdmin
    .from('match_results')
    .update(patch)
    .eq('challenge_id', id)
    .select()
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Check if both sides have confirmed → apply ELO
  const bothConfirmed =
    (isChallengerSide ? true : mr.challenger_confirmed) &&
    (isOpponentSide   ? true : mr.opponent_confirmed);

  if (bothConfirmed && !mr.elo_applied) {
    // Load both teams
    const [{ data: teamA }, { data: teamB }] = await Promise.all([
      supabaseAdmin.from('teams').select('*').eq('id', challenge.challenger_team_id).single(),
      supabaseAdmin.from('teams').select('*').eq('id', challenge.opponent_team_id!).single(),
    ]);

    if (teamA && teamB) {
      const resultA = isDraw ? 0.5 : (winnerId === teamA.id ? 1 : 0) as 1 | 0.5 | 0;
      const { newA, newB, deltaA, deltaB } = calcElo(
        teamA.elo as number, teamB.elo as number, resultA,
        teamA.total_matches as number, teamB.total_matches as number
      );

      // Update both teams' stats
      await Promise.all([
        supabaseAdmin.from('teams').update({
          elo: newA,
          wins:          (teamA.wins   as number) + (resultA === 1   ? 1 : 0),
          losses:        (teamA.losses as number) + (resultA === 0   ? 1 : 0),
          draws:         (teamA.draws  as number) + (resultA === 0.5 ? 1 : 0),
          total_matches: (teamA.total_matches as number) + 1,
        }).eq('id', teamA.id),
        supabaseAdmin.from('teams').update({
          elo: newB,
          wins:          (teamB.wins   as number) + (resultA === 0   ? 1 : 0),
          losses:        (teamB.losses as number) + (resultA === 1   ? 1 : 0),
          draws:         (teamB.draws  as number) + (resultA === 0.5 ? 1 : 0),
          total_matches: (teamB.total_matches as number) + 1,
        }).eq('id', teamB.id),
        supabaseAdmin.from('match_results').update({ elo_applied: true }).eq('challenge_id', id),
        supabaseAdmin.from('challenges').update({ status: 'completed' }).eq('id', id),
      ]);

      return NextResponse.json({ ok: true, eloApplied: true, deltaA, deltaB, newEloA: newA, newEloB: newB });
    }
  }

  return NextResponse.json({ ok: true, eloApplied: false, waitingConfirmation: !bothConfirmed });
}
