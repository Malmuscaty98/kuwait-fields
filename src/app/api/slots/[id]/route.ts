import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Slot } from '@/lib/types';

function dbToSlot(row: Record<string, unknown>): Slot {
  const bookings = row.bookings as { id: string }[] | undefined;
  return {
    id: row.id as string,
    fieldId: row.field_id as string,
    date: row.date as string,
    startTime: (row.start_time as string).slice(0, 5),
    endTime: (row.end_time as string).slice(0, 5),
    isOpen: row.is_open as boolean,
    bookingId: bookings?.[0]?.id ?? undefined,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase
    .from('slots')
    .select('id, field_id, date, start_time, end_time, is_open, bookings(id)')
    .eq('id', id)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(dbToSlot(data as Record<string, unknown>));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase
    .from('slots')
    .update({ is_open: body.isOpen })
    .eq('id', id)
    .select('id, field_id, date, start_time, end_time, is_open, bookings(id)')
    .single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(dbToSlot(data as Record<string, unknown>));
}
