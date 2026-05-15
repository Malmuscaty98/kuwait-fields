import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ── GET /api/teams  (current user's team) ──────────────────────────── */
export async function GET() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('owner_user_id', user.id)
    .single();

  if (!data) return NextResponse.json(null);
  return NextResponse.json(data);
}

/* ── POST /api/teams  (create or update team name) ──────────────────── */
export async function POST(req: Request) {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await req.json();
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
    return NextResponse.json({ error: 'اسم الفريق يجب أن يكون بين ٢ و٥٠ حرف' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('teams')
    .upsert(
      { owner_user_id: user.id, name: name.trim() },
      { onConflict: 'owner_user_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
