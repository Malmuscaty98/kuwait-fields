import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { Slot } from '@/lib/types';

function dbToSlot(row: Record<string, unknown>): Slot {
  const bookings = row.bookings as { id: string; status: string }[] | undefined;
  // Only confirmed/done bookings actually occupy the slot
  const activeBooking = bookings?.find(
    b => b.status === 'confirmed' || b.status === 'done'
  );
  return {
    id: row.id as string,
    fieldId: row.field_id as string,
    date: row.date as string,
    startTime: (row.start_time as string).slice(0, 5),
    endTime: (row.end_time as string).slice(0, 5),
    isOpen: row.is_open as boolean,
    bookingId: activeBooking?.id ?? undefined,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get('fieldId');
  const date = searchParams.get('date');

  let query = supabaseAdmin
    .from('slots')
    .select('id, field_id, date, start_time, end_time, is_open, bookings(id, status)')
    .order('start_time');

  if (fieldId) query = query.eq('field_id', fieldId);
  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(r => dbToSlot(r as Record<string, unknown>)));
}
