import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createCharge } from '@/lib/tap';

export async function POST(req: Request) {
  const { bookingId } = await req.json();
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });

  // Fetch booking + field details
  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: field, error: fErr } = await supabaseAdmin
    .from('fields')
    .select('price_per_hour, name_ar')
    .eq('id', booking.field_id)
    .single();

  if (fErr || !field) return NextResponse.json({ error: 'Field not found' }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kuwait-fields.vercel.app';
  const callbackUrl = `${baseUrl}/api/payment/callback`;

  try {
    const charge = await createCharge({
      amount: Number(field.price_per_hour),
      currency: 'KWD',
      customerName: booking.customer_name,
      phone: booking.phone,
      description: `حجز ${field.name_ar} — ${booking.ref}`,
      bookingRef: booking.ref,
      callbackUrl,
    });

    // Store tap charge id on booking
    await supabaseAdmin
      .from('bookings')
      .update({ tap_charge_id: charge.id })
      .eq('id', bookingId);

    return NextResponse.json({ paymentUrl: charge.transaction.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment initiation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
