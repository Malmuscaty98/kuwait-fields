import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ── helpers ── */
async function requireAdmin() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('user_id', user.id).single();
  return profile?.role === 'admin' ? user : null;
}

/* ── GET /api/admin/users ── */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get('search')?.trim() ?? '';
  const role     = searchParams.get('role') ?? 'all';      // all | customer | admin
  const status   = searchParams.get('status') ?? 'all';    // all | active | disabled

  let query = supabaseAdmin
    .from('profiles')
    .select('user_id, email, full_name, role, disabled, created_at')
    .order('created_at', { ascending: false });

  if (role !== 'all')   query = query.eq('role', role);
  if (status === 'active')   query = query.or('disabled.is.null,disabled.eq.false');
  if (status === 'disabled') query = query.eq('disabled', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Client-side search (small dataset)
  let rows = data ?? [];
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(r =>
      (r.full_name as string)?.toLowerCase().includes(q) ||
      (r.email as string)?.toLowerCase().includes(q)
    );
  }

  // Also fetch total bookings per user
  const userIds = rows.map(r => r.user_id as string);
  let bookingCounts: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('user_id')
      .in('user_id', userIds)
      .not('status', 'eq', 'cancelled');

    for (const b of bookings ?? []) {
      const uid = b.user_id as string;
      bookingCounts[uid] = (bookingCounts[uid] ?? 0) + 1;
    }
  }

  return NextResponse.json(rows.map(r => ({
    userId:        r.user_id,
    email:         r.email,
    fullName:      r.full_name,
    role:          r.role,
    disabled:      r.disabled ?? false,
    createdAt:     r.created_at,
    totalBookings: bookingCounts[r.user_id as string] ?? 0,
  })));
}

/* ── PATCH /api/admin/users ── */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, disabled } = await req.json();
  if (!userId || typeof disabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Prevent admin from disabling themselves
  if (userId === admin.id) {
    return NextResponse.json({ error: 'لا يمكنك تعطيل حسابك الخاص' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ disabled })
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also ban/unban in Supabase Auth (prevents login)
  try {
    if (disabled) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876600h', // ~100 years
      });
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      });
    }
  } catch { /* non-fatal — profiles flag is source of truth */ }

  return NextResponse.json({ ok: true });
}
