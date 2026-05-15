import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { Booking, BookingStatus } from '@/lib/types';

// A09 — structured security event logger
function secLog(event: string, detail: Record<string, unknown>) {
  console.warn(`[SECURITY] ${event}`, JSON.stringify(detail));
}

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

/** Public-safe view: only fields the customer themselves needs for confirmation */
function dbToBookingPublic(row: Record<string, unknown>) {
  return {
    ref: row.ref as string,
    fieldId: row.field_id as string,
    slotId: row.slot_id as string,
    status: row.status as BookingStatus,
    createdAt: row.created_at as string,
  };
}

function generateRef(): string {
  // Use crypto.getRandomValues for a cryptographically secure ref
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return 'KW' + Array.from(arr, b => b.toString(36)).join('').slice(0, 6).toUpperCase();
}

// --- Input validation helpers ---
const NAME_RE  = /^[\p{L}\p{M}\s\-'.]{2,100}$/u;
const PHONE_RE = /^\+?[\d\s\-]{7,20}$/;

function validateBookingInput(body: Record<string, unknown>): string | null {
  const { customerName, phone, notes } = body;
  if (typeof customerName !== 'string' || !NAME_RE.test(customerName.trim())) {
    return 'الاسم غير صالح (2-100 حرف، أحرف فقط)';
  }
  if (typeof phone !== 'string' || !PHONE_RE.test(phone.trim())) {
    return 'رقم الهاتف غير صالح';
  }
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string' || notes.length > 500) {
      return 'الملاحظات يجب أن تكون أقل من 500 حرف';
    }
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date   = searchParams.get('date');
  const status = searchParams.get('status');
  const ref    = searchParams.get('ref');

  // --- Public route: customer looks up their own booking by ref ---
  if (ref) {
    // Validate ref format to prevent enumeration / injection
    if (!/^KW[A-Z0-9]{6}$/.test(ref)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('ref, field_id, slot_id, status, created_at')
      .eq('ref', ref)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(dbToBookingPublic(data as Record<string, unknown>));
  }

  // --- Admin-only route: listing all bookings ---
  const authClient = await createAuthServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    secLog('UNAUTHORIZED_BOOKING_LIST', { ip: req.headers.get('x-forwarded-for') ?? 'unknown' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // M3 — A03: validate status param against allowed enum values
  const VALID_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'done', 'cancelled'];
  const safeStatus = VALID_STATUSES.includes(status as BookingStatus) ? (status as BookingStatus) : null;

  let query = authClient
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (safeStatus) query = query.eq('status', safeStatus);

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
  // M2 — A07: Rate limit: max 6 booking attempts per IP per 10 minutes
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `book:${ip}`, limit: 6, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    secLog('RATE_LIMIT_EXCEEDED', { ip, resetAt: new Date(rl.resetAt).toISOString() });
    return NextResponse.json(
      { error: 'الكثير من المحاولات، يرجى الانتظار قليلاً' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': '6',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const body = await req.json();
  const { fieldId, slotId, customerName, phone, notes, isChallenge, teamName } = body;

  // --- Required field check ---
  if (!fieldId || !slotId || !customerName || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // --- Input validation (H3) ---
  const validationError = validateBookingInput({ customerName, phone, notes });
  if (validationError) {
    secLog('INVALID_INPUT', { ip, field: validationError });
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  // Sanitise: trim whitespace
  const safeName  = (customerName as string).trim();
  const safePhone = (phone as string).trim();
  const safeNotes = notes ? (notes as string).trim() : null;

  // Use admin client for all server-side writes — bypasses RLS safely
  // (validation is done in code: slot availability + duplicate check)
  const { data: slot } = await supabaseAdmin
    .from('slots')
    .select('id, is_open')
    .eq('id', slotId)
    .single();

  if (!slot || !slot.is_open) {
    return NextResponse.json({ error: 'Slot not available' }, { status: 409 });
  }

  // Block only if a confirmed/done booking exists (not pending/cancelled)
  const { count: activeCount } = await supabaseAdmin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', slotId)
    .in('status', ['confirmed', 'done']);

  if ((activeCount ?? 0) > 0) {
    return NextResponse.json({ error: 'Slot already booked' }, { status: 409 });
  }

  // Cancel any stale pending bookings for this slot before creating a new one
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('slot_id', slotId)
    .eq('status', 'pending');

  // Optionally attach user_id if the customer is signed in
  let userId: string | null = null;
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) userId = user.id;
  } catch { /* guest booking — no user_id */ }

  const ref = generateRef();
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert({
      ref,
      field_id: fieldId,
      slot_id: slotId,
      customer_name: safeName,
      phone: safePhone,
      notes: safeNotes,
      status: 'pending',
      ...(userId ? { user_id: userId } : {}),
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation = slot was just taken by a concurrent request (H2)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slot already booked' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const booking = data as Record<string, unknown>;

  // ── Challenge flow ────────────────────────────────────────────────────
  if (isChallenge) {
    // Must be authenticated
    if (!userId) {
      // Roll back the booking we just created
      await supabaseAdmin.from('bookings').delete().eq('id', booking.id as string);
      return NextResponse.json({ error: 'يجب تسجيل الدخول لإنشاء تحدي' }, { status: 401 });
    }

    // Get or create team
    let { data: team } = await supabaseAdmin
      .from('teams')
      .select('id, name')
      .eq('owner_user_id', userId)
      .single();

    if (!team) {
      const tName = typeof teamName === 'string' ? teamName.trim() : '';
      if (tName.length < 2) {
        await supabaseAdmin.from('bookings').delete().eq('id', booking.id as string);
        return NextResponse.json({ error: 'يرجى إدخال اسم فريقك' }, { status: 400 });
      }
      const { data: newTeam, error: teamErr } = await supabaseAdmin
        .from('teams')
        .insert({ owner_user_id: userId, name: tName })
        .select()
        .single();
      if (teamErr) {
        await supabaseAdmin.from('bookings').delete().eq('id', booking.id as string);
        return NextResponse.json({ error: teamErr.message }, { status: 500 });
      }
      team = newTeam;
    }

    // Create challenge record
    const { data: challenge, error: chalErr } = await supabaseAdmin
      .from('challenges')
      .insert({
        booking_id:          booking.id,
        slot_id:             slotId,
        field_id:            fieldId,
        challenger_team_id:  team!.id,
        status:              'open',
      })
      .select()
      .single();

    if (chalErr) {
      await supabaseAdmin.from('bookings').delete().eq('id', booking.id as string);
      return NextResponse.json({ error: chalErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { ...dbToBooking(booking), challengeId: (challenge as Record<string, unknown>).id },
      { status: 201 }
    );
  }
  // ─────────────────────────────────────────────────────────────────────

  return NextResponse.json(dbToBooking(booking), { status: 201 });
}
