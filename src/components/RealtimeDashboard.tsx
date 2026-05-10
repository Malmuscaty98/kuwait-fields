'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import Badge from '@/components/ui/Badge';
import type { BookingStatus } from '@/lib/types';

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface Stats {
  totalBookings: number;
  confirmedBookings: number;
  revenue: number;
  openSlots: number;
  recent: {
    id: string;
    ref: string;
    status: string;
    customer_name: string;
    field_name: string;
    slot_start: string | null;
    slot_end: string | null;
  }[];
}

function SkeletonCard() {
  return (
    <div className="bg-gray-100 rounded-2xl p-4 lg:p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

export default function RealtimeDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);   // flash on update
  const [newCount, setNewCount] = useState(0);

  const fetchStats = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const res = await fetch('/api/admin/stats', { cache: 'no-store' });
    if (res.ok) {
      const data: Stats = await res.json();
      setStats(prev => {
        // Detect new bookings
        if (prev && data.totalBookings > prev.totalBookings) {
          setNewCount(n => n + (data.totalBookings - prev.totalBookings));
          setPulse(true);
          setTimeout(() => setPulse(false), 1500);
        }
        return data;
      });
    }
    if (!isBackground) setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, () => {
        fetchStats(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, () => {
        fetchStats(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStats]);

  const STAT_CARDS = stats ? [
    {
      label: 'حجوزات اليوم',
      value: stats.totalBookings,
      sub: `${stats.confirmedBookings} مؤكد`,
      bg: 'bg-green-50',
      textColor: 'text-green-700',
      icon: (
        <svg className="w-6 h-6 lg:w-9 lg:h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: 'الإيرادات اليوم',
      value: `${stats.revenue.toFixed(3)} د.ك`,
      sub: 'المبالغ المحصلة',
      bg: 'bg-blue-50',
      textColor: 'text-blue-700',
      icon: (
        <svg className="w-6 h-6 lg:w-9 lg:h-9 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'مواعيد متاحة',
      value: stats.openSlots,
      sub: 'في اليوم',
      bg: 'bg-amber-50',
      textColor: 'text-amber-700',
      icon: (
        <svg className="w-6 h-6 lg:w-9 lg:h-9 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ] : [];

  return (
    <>
      {/* New booking toast */}
      {newCount > 0 && (
        <div className="bg-green-600 text-white rounded-2xl px-5 py-3 mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-semibold">
              {newCount === 1 ? 'وصل حجز جديد!' : `وصل ${newCount} حجوزات جديدة!`}
            </span>
          </div>
          <button onClick={() => setNewCount(0)} className="text-white/70 hover:text-white text-lg leading-none">✕</button>
        </div>
      )}

      {/* Stats grid */}
      <div className={`grid grid-cols-3 gap-3 lg:gap-5 mb-6 lg:mb-8 transition-all duration-500 ${pulse ? 'scale-[1.01]' : ''}`}>
        {loading || !stats
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : STAT_CARDS.map(card => (
            <div key={card.label} className={`${card.bg} rounded-2xl p-4 lg:p-6 transition-all duration-300`}>
              <div className="flex items-start justify-between mb-2 lg:mb-4">
                {card.icon}
              </div>
              <p className={`text-2xl lg:text-4xl font-extrabold ${card.textColor}`}>{card.value}</p>
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">{card.label}</p>
              <p className="text-xs lg:text-sm text-gray-400">{card.sub}</p>
            </div>
          ))
        }
      </div>

      {/* Today's bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 lg:px-6 py-4 lg:py-5 border-b border-gray-100">
          <h2 className="font-bold lg:text-xl text-gray-900">حجوزات اليوم</h2>
          <Link href="/admin/bookings" className="text-green-600 text-sm lg:text-base font-semibold hover:text-green-700">
            عرض الكل
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="w-16 h-6 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : !stats || stats.recent.length === 0 ? (
          <div className="text-center py-12 lg:py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 text-sm lg:text-base">لا توجد حجوزات اليوم</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recent.map(booking => (
              <Link
                key={booking.id}
                href={`/admin/bookings/${booking.id}`}
                className="flex items-center justify-between px-5 lg:px-6 py-4 lg:py-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 lg:gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-green-700 font-bold text-sm lg:text-base">
                      {booking.customer_name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm lg:text-base truncate">{booking.customer_name}</p>
                    <p className="text-xs lg:text-sm text-gray-400 mt-0.5">
                      {booking.field_name} •{' '}
                      {booking.slot_start && booking.slot_end
                        ? `${formatTime12(booking.slot_start)} — ${formatTime12(booking.slot_end)}`
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mr-3 flex-shrink-0">
                  <Badge status={booking.status as BookingStatus} />
                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
