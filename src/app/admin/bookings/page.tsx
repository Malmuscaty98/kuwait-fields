'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { createBrowserClient } from '@supabase/ssr';
import type { Booking, BookingStatus, Field, Slot } from '@/lib/types';

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface EnrichedBooking extends Booking {
  _field?: Field;
  _slot?: Slot;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'جميع الحالات' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'done', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغي' },
];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    fetch('/api/fields').then(r => r.json()).then(setFields);
  }, []);

  const fetchBookings = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const params = new URLSearchParams();
    if (filterDate) params.set('date', filterDate);
    if (filterStatus) params.set('status', filterStatus);
    const data: Booking[] = await fetch(`/api/bookings?${params}`).then(r => r.json());
    const slotIds = [...new Set(data.map(b => b.slotId))];
    const slotData = await Promise.all(slotIds.map(id => fetch(`/api/slots/${id}`).then(r => r.json()).catch(() => null)));
    const slotMap = Object.fromEntries(slotData.filter(Boolean).map((s: Slot) => [s.id, s]));
    const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]));
    setBookings(data.map(b => ({ ...b, _field: fieldMap[b.fieldId], _slot: slotMap[b.slotId] })));
    setLoading(false);
  }, [filterDate, filterStatus, fields]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('admin-bookings-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, () => {
        setNewCount(n => n + 1);
        fetchBookings(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, () => {
        fetchBookings(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  return (
    <div>
      <div className="mb-6 lg:mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl lg:text-3xl font-extrabold text-gray-900">الحجوزات</h1>
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              مباشر
            </div>
          </div>
          <p className="text-gray-500 text-sm lg:text-base">جميع حجوزات الملاعب</p>
        </div>
        <Link
          href="/book"
          className="bg-green-600 text-white font-semibold text-sm lg:text-base px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl hover:bg-green-700 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          حجز جديد
        </Link>
      </div>

      {/* New booking toast */}
      {newCount > 0 && (
        <div className="bg-green-600 text-white rounded-2xl px-5 py-3 mb-4 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-semibold">
              {newCount === 1 ? 'وصل حجز جديد!' : `وصل ${newCount} حجوزات جديدة!`}
            </span>
          </div>
          <button onClick={() => setNewCount(0)} className="text-white/70 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 mb-4 lg:mb-5 flex flex-wrap gap-3 lg:gap-4">
        <div className="flex-1 min-w-36">
          <label className="block text-xs lg:text-sm font-semibold text-gray-400 mb-1.5">التاريخ</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex-1 min-w-36">
          <label className="block text-xs lg:text-sm font-semibold text-gray-400 mb-1.5">الحالة</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {(filterDate || filterStatus) && (
          <div className="flex items-end">
            <button
              onClick={() => { setFilterDate(''); setFilterStatus(''); }}
              className="border border-gray-200 rounded-xl px-3 lg:px-4 py-2 lg:py-3 text-sm lg:text-base text-gray-500 hover:bg-gray-50 transition-colors"
            >
              مسح الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 lg:py-5 flex gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 lg:h-5 bg-gray-100 rounded animate-pulse w-1/3" />
                  <div className="h-3 lg:h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                </div>
                <div className="w-16 h-6 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 lg:py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 text-sm lg:text-base">لا توجد حجوزات مطابقة</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bookings.map(booking => (
              <Link
                key={booking.id}
                href={`/admin/bookings/${booking.id}`}
                className="flex items-center gap-4 px-5 lg:px-6 py-4 lg:py-5 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-bold text-sm lg:text-base">
                    {booking.customerName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm lg:text-base truncate">{booking.customerName}</p>
                  <p className="text-xs lg:text-sm text-gray-400 mt-0.5 truncate">
                    {booking._field?.nameAr ?? '—'} •{' '}
                    {booking._slot
                      ? `${formatTime12(booking._slot.startTime)} • ${booking._slot.date}`
                      : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
                  <div className="text-left hidden sm:block">
                    <p className="text-xs lg:text-sm text-gray-400 font-mono" dir="ltr">{booking.ref}</p>
                  </div>
                  <Badge status={booking.status} />
                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs lg:text-sm text-gray-400 text-center mt-3">
        {!loading && `${bookings.length} حجز`}
      </p>
    </div>
  );
}
