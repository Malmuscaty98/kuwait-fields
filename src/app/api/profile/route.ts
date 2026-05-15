import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, role, created_at')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    // Profile might not exist yet (race on first login) — return minimal data
    return NextResponse.json({
      profile: { fullName: user.email?.split('@')[0] ?? '', email: user.email ?? '', role: 'customer', createdAt: new Date().toISOString() },
      stats: { totalBookings: 0, upcomingCount: 0, favouriteField: null },
      bookings: [],
    });
  }

  // Load bookings (flat query — no joins to avoid FK issues)
  const { data: bookingsRaw } = await supabaseAdmin
    .from('bookings')
    .select('id, ref, status, created_at, field_id, slot_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const rows = bookingsRaw ?? [];

  // Collect unique field_ids and slot_ids
  const fieldIds  = [...new Set(rows.map(b => b.field_id as string).filter(Boolean))];
  const slotIds   = [...new Set(rows.map(b => b.slot_id  as string).filter(Boolean))];

  // Fetch fields + slots in parallel
  const [fieldsRes, slotsRes] = await Promise.all([
    fieldIds.length > 0
      ? supabaseAdmin.from('fields').select('id, name_ar, location_ar, image_url').in('id', fieldIds)
      : { data: [] },
    slotIds.length > 0
      ? supabaseAdmin.from('slots').select('id, date, start_time, end_time').in('id', slotIds)
      : { data: [] },
  ]);

  const fieldsMap = Object.fromEntries((fieldsRes.data ?? []).map(f => [f.id, f]));
  const slotsMap  = Object.fromEntries((slotsRes.data  ?? []).map(s => [s.id, s]));

  // Compute stats
  const today = new Date().toISOString().split('T')[0];
  let upcomingCount = 0;
  const fieldCount: Record<string, number> = {};

  for (const b of rows) {
    const slot = slotsMap[b.slot_id as string];
    if (slot && (slot.date as string) >= today && b.status !== 'cancelled') upcomingCount++;
    if (b.field_id && b.status !== 'cancelled') {
      fieldCount[b.field_id as string] = (fieldCount[b.field_id as string] ?? 0) + 1;
    }
  }

  // Favourite field
  let favouriteField: { nameAr: string; locationAr: string; imageUrl?: string } | null = null;
  let maxCount = 0;
  for (const [fid, cnt] of Object.entries(fieldCount)) {
    if (cnt > maxCount) { maxCount = cnt; const f = fieldsMap[fid]; if (f) favouriteField = { nameAr: f.name_ar as string, locationAr: f.location_ar as string, imageUrl: (f.image_url as string) ?? undefined }; }
  }

  // Shape bookings
  const bookingList = rows.map(b => {
    const slot  = slotsMap[b.slot_id as string];
    const field = fieldsMap[b.field_id as string];
    return {
      id:             b.id,
      ref:            b.ref,
      status:         b.status,
      createdAt:      b.created_at,
      date:           slot?.date       ?? null,
      startTime:      slot?.start_time ?? null,
      endTime:        slot?.end_time   ?? null,
      fieldNameAr:    field?.name_ar    ?? null,
      fieldLocationAr: field?.location_ar ?? null,
      fieldImageUrl:  field?.image_url  ?? null,
    };
  });

  return NextResponse.json({
    profile: {
      fullName:  profile.full_name  as string,
      email:     profile.email      as string,
      role:      profile.role       as string,
      createdAt: profile.created_at as string,
    },
    stats: { totalBookings: rows.length, upcomingCount, favouriteField },
    bookings: bookingList,
  });
}
