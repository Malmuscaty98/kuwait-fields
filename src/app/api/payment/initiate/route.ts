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

  // A10 — SSRF: build callbackUrl from trusted sources only (env var or own request origin)
  // Never allow user-supplied URLs.
  const reqUrl = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${reqUrl.protocol}//${reqUrl.host}`;

  // Validate the resolved base URL is a real HTTP(S) origin (not file://, data:, etc.)
  let callbackUrl: string;
  try {
    const parsed = new URL(`${baseUrl}/api/payment/callback`);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Invalid protocol');
    }
    callbackUrl = parsed.toString();
  } catch {
    console.error('[SECURITY] Invalid callback URL derived from env/request:', baseUrl);
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

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
