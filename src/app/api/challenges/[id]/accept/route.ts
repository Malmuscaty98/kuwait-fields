import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });

  const { teamName } = await req.json();

  // Load challenge
  const { data: challenge } = await supabaseAdmin
    .from('challenges')
    .select('id, status, challenger_team_id, booking_id, slot_id')
    .eq('id', id)
    .single();

  if (!challenge) return NextResponse.json({ error: 'التحدي غير موجود' }, { status: 404 });
  if (challenge.status !== 'open') return NextResponse.json({ error: 'التحدي غير متاح' }, { status: 409 });

  // Check: opponent ≠ challenger
  const { data: challengerTeam } = await supabaseAdmin
    .from('teams')
    .select('owner_user_id')
    .eq('id', challenge.challenger_team_id)
    .single();
  if (challengerTeam?.owner_user_id === user.id) {
    return NextResponse.json({ error: 'لا يمكنك قبول تحديك الخاص' }, { status: 400 });
  }

  // Get or create opponent team
  let { data: team } = await supabaseAdmin
    .from('teams')
    .select('id, name')
    .eq('owner_user_id', user.id)
    .single();

  if (!team) {
    if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2) {
      return NextResponse.json({ error: 'يرجى إدخال اسم فريقك' }, { status: 400 });
    }
    const { data: newTeam, error: teamErr } = await supabaseAdmin
      .from('teams')
      .insert({ owner_user_id: user.id, name: teamName.trim() })
      .select()
      .single();
    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 500 });
    team = newTeam;
  }

  // Update challenge
  const { error: chalErr } = await supabaseAdmin
    .from('challenges')
    .update({ opponent_team_id: team!.id, status: 'accepted' })
    .eq('id', id);
  if (chalErr) return NextResponse.json({ error: chalErr.message }, { status: 500 });

  // Confirm the booking
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', challenge.booking_id);

  // Create match_results record (empty — to be filled after match)
  await supabaseAdmin
    .from('match_results')
    .insert({ challenge_id: id });

  return NextResponse.json({ ok: true, teamId: team!.id, teamName: team!.name });
}
