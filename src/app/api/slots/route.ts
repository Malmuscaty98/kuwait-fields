import { NextResponse } from 'next/server';
import { getSlots } from '@/lib/store';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get('fieldId') ?? undefined;
  const date = searchParams.get('date') ?? undefined;
  return NextResponse.json(getSlots(fieldId, date));
}
