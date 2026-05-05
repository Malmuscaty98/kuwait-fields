import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Field, FieldSize } from '@/lib/types';

const GRADIENTS = [
  'from-green-600 to-green-800',
  'from-emerald-500 to-teal-700',
  'from-teal-600 to-cyan-800',
];

function dbToField(row: Record<string, unknown>, index: number): Field {
  return {
    id: row.id as string,
    name: row.name_en as string,
    nameAr: row.name_ar as string,
    location: row.location_en as string,
    locationAr: row.location_ar as string,
    pricePerHour: Number(row.price_per_hour),
    size: (row.size ?? 'full') as FieldSize,
    description: (row.description_ar as string) ?? '',
    features: [],
    gradient: GRADIENTS[index % GRADIENTS.length],
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];

  if (id) {
    const index = rows.findIndex(r => r.id === id);
    if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(dbToField(rows[index], index));
  }

  return NextResponse.json(rows.map(dbToField));
}
