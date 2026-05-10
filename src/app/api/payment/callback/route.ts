import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { retrieveCharge } from '@/lib/tap';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tapId = searchParams.get('tap_id');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://kuwait-fields.vercel.app';

  if (!tapId) {
    return NextResponse.redirect(`${baseUrl}/book?error=missing_tap_id`);
  }

  try {
    const charge = await retrieveCharge(tapId);
    const bookingRef = charge.metadata?.bookingRef;

    if (!bookingRef) {
      return NextResponse.redirect(`${baseUrl}/book?error=no_ref`);
    }

    if (charge.status === 'CAPTURED') {
      // Payment successful — confirm the booking
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('ref', bookingRef);

      return NextResponse.redirect(`${baseUrl}/book/confirmation?ref=${bookingRef}`);
    } else {
      // Payment failed or cancelled — cancel the booking
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('ref', bookingRef);

      return NextResponse.redirect(
        `${baseUrl}/book/payment-failed?ref=${bookingRef}&reason=${charge.status}`
      );
    }
  } catch (err) {
    console.error('Payment callback error:', err);
    return NextResponse.redirect(`${baseUrl}/book?error=callback_failed`);
  }
}
