/**
 * Tap Payments API helper (v2)
 * Docs: https://tappayments.api-docs.io/2.0/charges
 */

const TAP_API_URL = 'https://api.tap.company/v2';

/** Read key lazily so missing env var only fails at call time, not module load */
function getTapKey(): string {
  const key = process.env.TAP_SECRET_KEY;
  if (!key) throw new Error('TAP_SECRET_KEY environment variable is not set');
  return key;
}

export interface TapChargeResult {
  id: string;
  status: string;
  transaction: { url: string };
}

interface CreateChargeParams {
  amount: number;
  currency: string;
  customerName: string;
  phone: string;
  description: string;
  bookingRef: string;
  callbackUrl: string;
}

export async function createCharge(params: CreateChargeParams): Promise<TapChargeResult> {
  const [firstName, ...rest] = params.customerName.trim().split(' ');
  const lastName = rest.join(' ') || firstName;

  // Clean phone: strip leading zeros/country code, keep 8 digits
  const rawPhone = params.phone.replace(/\D/g, '');
  const localPhone = rawPhone.startsWith('965')
    ? rawPhone.slice(3)
    : rawPhone.startsWith('00965')
    ? rawPhone.slice(5)
    : rawPhone;

  const body = {
    amount: params.amount,
    currency: params.currency,
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    description: params.description,
    statement_descriptor: 'Kuwait Fields',
    reference: { transaction: params.bookingRef, order: params.bookingRef },
    metadata: { bookingRef: params.bookingRef },
    receipt: { email: false, sms: false },
    customer: {
      first_name: firstName,
      last_name: lastName,
      phone: { country_code: '965', number: localPhone },
    },
    source: { id: 'src_all' },
    redirect: { url: params.callbackUrl },
  };

  const res = await fetch(`${TAP_API_URL}/charges`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getTapKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tap API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<TapChargeResult>;
}

export async function retrieveCharge(chargeId: string): Promise<{ status: string; metadata?: { bookingRef?: string } }> {
  const res = await fetch(`${TAP_API_URL}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${getTapKey()}` },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Tap retrieve error ${res.status}`);
  return res.json();
}
