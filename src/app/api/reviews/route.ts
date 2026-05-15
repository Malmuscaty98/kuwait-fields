import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/* ── GET /api/reviews?club=نادي العربي ─────────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const club = searchParams.get('club');
  if (!club) return NextResponse.json({ error: 'club param required' }, { status: 400 });

  // Fetch reviews (flat — no join; we'll look up names separately)
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, comment, created_at, user_id')
    .eq('club_ar', club)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<{
    id: string; rating: number; comment: string | null;
    created_at: string; user_id: string;
  }>;

  // Fetch display names from profiles in one query
  const userIds = [...new Set(rows.map(r => r.user_id))];
  const nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    for (const p of profiles ?? []) nameMap[p.user_id as string] = (p.full_name as string) || 'مستخدم';
  }

  const reviews = rows.map(r => ({
    id:        r.id,
    rating:    r.rating,
    comment:   r.comment ?? '',
    createdAt: r.created_at,
    userName:  nameMap[r.user_id] ?? 'مستخدم',
    userId:    r.user_id,
  }));

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  // Check if current user has already reviewed this club
  let currentUserReviewId: string | null = null;
  let currentUserCanReview = false;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      const existing = reviews.find(r => r.userId === user.id);
      currentUserReviewId = existing?.id ?? null;

      if (!existing) {
        // Check if user has a confirmed/done booking in a field of this club
        const { count } = await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['confirmed', 'done'])
          .in('field_id', await getFieldIdsForClub(club));
        currentUserCanReview = (count ?? 0) > 0;
      }
    }
  } catch { /* guest */ }

  return NextResponse.json({
    reviews,
    avgRating,
    totalCount: reviews.length,
    currentUserReviewId,
    currentUserCanReview,
  });
}

async function getFieldIdsForClub(clubAr: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('fields')
    .select('id')
    .eq('club_ar', clubAr);
  return (data ?? []).map(f => f.id as string);
}

/* ── POST /api/reviews ──────────────────────────────────────────────── */
const COMMENT_MAX = 1000;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `review:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'الكثير من المحاولات' }, { status: 429 });
  }

  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });

  const body = await req.json();
  const { club_ar, rating, comment } = body;

  if (!club_ar || typeof club_ar !== 'string' || club_ar.length > 100) {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'التقييم يجب أن يكون بين ١ و٥' }, { status: 400 });
  }
  if (comment && (typeof comment !== 'string' || comment.length > COMMENT_MAX)) {
    return NextResponse.json({ error: `التعليق يجب أن يكون أقل من ${COMMENT_MAX} حرف` }, { status: 400 });
  }

  // Verify the user has a confirmed/done booking in this club
  const fieldIds = await getFieldIdsForClub(club_ar);
  if (fieldIds.length === 0) {
    return NextResponse.json({ error: 'النادي غير موجود' }, { status: 404 });
  }

  const { count } = await supabaseAdmin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['confirmed', 'done'])
    .in('field_id', fieldIds);

  if ((count ?? 0) === 0) {
    return NextResponse.json(
      { error: 'يجب أن تكون قد حجزت في هذا النادي لتتمكن من التقييم' },
      { status: 403 }
    );
  }

  // Upsert (update if already reviewed)
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .upsert(
      {
        user_id:  user.id,
        club_ar,
        rating,
        comment:  comment ? comment.trim() : null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,club_ar' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

/* ── DELETE /api/reviews?id=xxx ─────────────────────────────────────── */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use anon client so RLS verifies ownership
  const { error } = await authClient.from('reviews').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
