import { NextResponse } from 'next/server';
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authClient = await createAuthServerClient();
  const { data, error } = await authClient
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(dbToBooking(data as Record<string, unknown>));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const authClient = await createAuthServerClient();

  // Allow status update or isOpen for slots
  const updateData: Record<string, unknown> = {};
  if (body.status !== undefined) updateData.status = body.status as BookingStatus;

  const { data, error } = await authClient
    .from('bookings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 });
  return NextResponse.json(dbToBooking(data as Record<string, unknown>));
}
