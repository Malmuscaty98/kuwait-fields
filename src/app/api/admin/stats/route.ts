import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createAuthServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Require authenticated admin session
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuwait' });

  // Today's slots
  const { data: todaySlots } = await supabaseAdmin
    .from('slots')
    .select('id, is_open')
    .eq('date', today);

  const todaySlotIds = (todaySlots ?? []).map(s => s.id);

  // Today's bookings
  const { data: bookings } = todaySlotIds.length > 0
    ? await supabaseAdmin
        .from('bookings')
        .select('id, status, field_id, customer_name, phone, slot_id, created_at, ref')
        .in('slot_id', todaySlotIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  // Fields for price lookup
  const fieldIds = [...new Set((bookings ?? []).map(b => b.field_id))];
  const { data: fields } = fieldIds.length > 0
    ? await supabaseAdmin.from('fields').select('id, name_ar, price_per_hour').in('id', fieldIds)
    : { data: [] };

  // Slots for time display
  const slotIds = [...new Set((bookings ?? []).map(b => b.slot_id))];
  const { data: slots } = slotIds.length > 0
    ? await supabaseAdmin.from('slots').select('id, start_time, end_time').in('id', slotIds)
    : { data: [] };

  const fieldMap = Object.fromEntries((fields ?? []).map(f => [f.id, f]));
  const slotMap  = Object.fromEntries((slots  ?? []).map(s => [s.id, s]));

  const allBookings = bookings ?? [];
  const totalBookings    = allBookings.length;
  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length;
  const revenue = allBookings
    .filter(b => b.status === 'confirmed' || b.status === 'done')
    .reduce((sum, b) => sum + Number(fieldMap[b.field_id]?.price_per_hour ?? 0), 0);

  // Open slots (is_open + no booking)
  const bookedSlotIds = new Set(allBookings.map(b => b.slot_id));
  const openSlots = (todaySlots ?? []).filter(s => s.is_open && !bookedSlotIds.has(s.id)).length;

  // Enrich recent 5 bookings
  const recent = allBookings.slice(0, 5).map(b => ({
    id:            b.id,
    ref:           b.ref,
    status:        b.status,
    customer_name: b.customer_name,
    field_name:    fieldMap[b.field_id]?.name_ar ?? '—',
    slot_start:    slotMap[b.slot_id] ? (slotMap[b.slot_id].start_time as string).slice(0, 5) : null,
    slot_end:      slotMap[b.slot_id] ? (slotMap[b.slot_id].end_time   as string).slice(0, 5) : null,
  }));

  return NextResponse.json({ totalBookings, confirmedBookings, revenue, openSlots, recent });
}
