import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createAuthServerClient } from '@/lib/supabase-server';
import type { Booking, BookingStatus } from '@/lib/types';

function dbToBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    ref: row.ref as string,
    fieldId: row.field_id as string,
    slotId: row.slot_id as string,
    customerName: row.customer_name as string,
    phone: row.phone as string,
    notes: (row.notes as string) ?? undefined,
    status: row.status as BookingStatus,
    createdAt: row.created_at as string,
  };
}

function generateRef(): string {
  return 'KW' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function GET(req: Request) {
  // Use authenticated server client so RLS allows admin reads
  const authClient = await createAuthServerClient();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const status = searchParams.get('status');
  const ref = searchParams.get('ref');

  if (ref) {
    const { data, error } = await authClient
      .from('bookings')
      .select('*')
      .eq('ref', ref)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(dbToBooking(data as Record<string, unknown>));
  }

  let query = authClient
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status as string);

  if (date) {
    const { data: slots } = await authClient
      .from('slots')
      .select('id')
      .eq('date', date);
    const slotIds = (slots ?? []).map(s => s.id);
    if (slotIds.length === 0) return NextResponse.json([]);
    query = query.in('slot_id', slotIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(r => dbToBooking(r as Record<string, unknown>)));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { fieldId, slotId, customerName, phone, notes } = body;
  if (!fieldId || !slotId || !customerName || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Use server client (handles both anon and authenticated sessions via cookies)
  const client = await createAuthServerClient();

  const { data: slot } = await client
    .from('slots')
    .select('id, is_open')
    .eq('id', slotId)
    .single();

  if (!slot || !slot.is_open) {
    return NextResponse.json({ error: 'Slot not available' }, { status: 409 });
  }

  // Check if already booked
  const { count } = await client
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', slotId);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Slot already booked' }, { status: 409 });
  }

  const ref = generateRef();
  const { data, error } = await client
    .from('bookings')
    .insert({
      ref,
      field_id: fieldId,
      slot_id: slotId,
      customer_name: customerName,
      phone,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToBooking(data as Record<string, unknown>), { status: 201 });
}
