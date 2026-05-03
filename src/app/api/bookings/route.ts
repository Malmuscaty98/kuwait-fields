import { NextResponse } from 'next/server';
import { getBookings, createBooking } from '@/lib/store';
import type { BookingStatus } from '@/lib/types';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? undefined;
  const status = (searchParams.get('status') ?? undefined) as BookingStatus | undefined;
  const ref = searchParams.get('ref');

  if (ref) {
    const { getBookingByRef } = require('@/lib/store');
    const booking = getBookingByRef(ref);
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(booking);
  }

  return NextResponse.json(getBookings(date, status));
}

export async function POST(req: Request) {
  const body = await req.json();
  const { fieldId, slotId, customerName, phone, notes } = body;
  if (!fieldId || !slotId || !customerName || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const booking = createBooking({ fieldId, slotId, customerName, phone, notes });
  if (!booking) {
    return NextResponse.json({ error: 'Slot not available' }, { status: 409 });
  }
  return NextResponse.json(booking, { status: 201 });
}
