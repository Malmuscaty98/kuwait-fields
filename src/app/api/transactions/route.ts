import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  // Require authenticated admin session
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all bookings that went through Tap payment (have tap_charge_id)
  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .not('tap_charge_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!bookings || bookings.length === 0) return NextResponse.json([]);

  // Batch-fetch unique fields and slots
  const fieldIds = [...new Set(bookings.map(b => b.field_id))];
  const slotIds  = [...new Set(bookings.map(b => b.slot_id))];

  const [{ data: fields }, { data: slots }] = await Promise.all([
    supabaseAdmin.from('fields').select('id, name_ar, price_per_hour').in('id', fieldIds),
    supabaseAdmin.from('slots').select('id, date, start_time, end_time').in('id', slotIds),
  ]);

  const fieldMap = Object.fromEntries((fields ?? []).map(f => [f.id, f]));
  const slotMap  = Object.fromEntries((slots  ?? []).map(s => [s.id, s]));

  const result = bookings.map(b => {
    const field = fieldMap[b.field_id];
    const slot  = slotMap[b.slot_id];
    return {
      id:            b.id,
      ref:           b.ref,
      tap_charge_id: b.tap_charge_id ?? null,
      status:        b.status,
      customer_name: b.customer_name,
      phone:         b.phone,
      created_at:    b.created_at,
      field_id:      b.field_id,
      slot_id:       b.slot_id,
      _fieldName:    field?.name_ar   ?? null,
      _price:        field ? Number(field.price_per_hour) : null,
      _slotDate:     slot?.date       ?? null,
      _slotStart:    slot ? (slot.start_time as string).slice(0, 5) : null,
      _slotEnd:      slot ? (slot.end_time   as string).slice(0, 5) : null,
    };
  });

  return NextResponse.json(result);
}
