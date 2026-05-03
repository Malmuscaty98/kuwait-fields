import { NextResponse } from 'next/server';
import { getSlotById, updateSlot } from '@/lib/store';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slot = getSlotById(id);
  if (!slot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(slot);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = updateSlot(id, { isOpen: body.isOpen });
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}
