import { NextResponse } from 'next/server';
import { getFields, getFieldById } from '@/lib/store';

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const field = getFieldById(id);
    if (!field) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(field);
  }
  return NextResponse.json(getFields());
}
