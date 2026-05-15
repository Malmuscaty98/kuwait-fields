import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { retrieveCharge } from '@/lib/tap';

// A09 — structured security/payment event logger
function payLog(event: string, detail: Record<string, unknown>) {
  console.warn(`[PAYMENT] ${event}`, JSON.stringify(detail));
}

// Allowed charge ID format from Tap (starts with "chg_")
const CHARGE_ID_RE = /^chg_[A-Za-z0-9_\-]{4,60}$/;

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const { searchParams } = reqUrl;
  const tapId = searchParams.get('tap_id');

  // Auto-detect base URL: prefer explicit env var, fall back to request origin
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${reqUrl.protocol}//${reqUrl.host}`;

  if (!tapId) {
    payLog('MISSING_TAP_ID', { url: req.url });
    return NextResponse.redirect(`${baseUrl}/book?error=missing_tap_id`);
  }

  // A10 — validate tap_id format before using it in an outbound API call
  if (!CHARGE_ID_RE.test(tapId)) {
    payLog('INVALID_TAP_ID', { tapId });
    return NextResponse.redirect(`${baseUrl}/book?error=invalid_tap_id`);
  }

  try {
    const charge = await retrieveCharge(tapId);
    const bookingRef = charge.metadata?.bookingRef;

    if (!bookingRef) {
      payLog('MISSING_BOOKING_REF', { tapId, status: charge.status });
      return NextResponse.redirect(`${baseUrl}/book?error=no_ref`);
    }

    if (charge.status === 'CAPTURED') {
      // Payment successful — confirm the booking
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('ref', bookingRef);

      payLog('PAYMENT_CONFIRMED', { tapId, bookingRef });
      return NextResponse.redirect(`${baseUrl}/book/confirmation?ref=${bookingRef}`);
    } else {
      // Payment failed or cancelled — cancel the booking
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('ref', bookingRef);

      payLog('PAYMENT_FAILED', { tapId, bookingRef, chargeStatus: charge.status });
      return NextResponse.redirect(
        `${baseUrl}/book/payment-failed?ref=${bookingRef}&reason=${charge.status}`
      );
    }
  } catch (err) {
    payLog('CALLBACK_ERROR', { tapId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.redirect(`${baseUrl}/book?error=callback_failed`);
  }
}
