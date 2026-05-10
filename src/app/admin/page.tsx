import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import RealtimeRefresher from '@/components/RealtimeRefresher';
import { supabase } from '@/lib/supabase';
import type { BookingStatus, FieldSize } from '@/lib/types';

const GRADIENTS = [
  'from-green-600 to-green-800',
  'from-emerald-500 to-teal-700',
  'from-teal-600 to-cyan-800',
];

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default async function AdminDashboard() {
  // Use Kuwait timezone (UTC+3) to get the correct local date on the server
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuwait' });

  const [{ data: todaySlots }, { data: allFields }] = await Promise.all([
    supabase.from('slots').select('id, is_open, bookings(id)').eq('date', today),
    supabase.from('fields').select('*').order('created_at'),
  ]);

  const todaySlotIds = (todaySlots ?? []).map(s => s.id);
  const fieldMap = Object.fromEntries(
    (allFields ?? []).map((f, i) => [f.id, { ...f, gradient: GRADIENTS[i % GRADIENTS.length], size: (f.size ?? 'full') as FieldSize }])
  );

  const { data: bookingsRaw } = todaySlotIds.length > 0
    ? await supabase
        .from('bookings')
        .select('*')
        .in('slot_id', todaySlotIds)
        .order('created_at', { ascending: false })
        .limit(5)
    : { data: [] };

  const todayBookings = bookingsRaw ?? [];

  const slotIds = [...new Set(todayBookings.map(b => b.slot_id))];
  const { data: slotsRaw } = slotIds.length > 0
    ? await supabase.from('slots').select('id, start_time, end_time').in('id', slotIds)
    : { data: [] };
  const slotMap = Object.fromEntries((slotsRaw ?? []).map(s => [s.id, s]));

  // Stats
  const openSlots = (todaySlots ?? []).filter(s => s.is_open && (s.bookings as { id: string }[]).length === 0).length;
  const { data: allTodayBookings } = todaySlotIds.length > 0
    ? await supabase.from('bookings').select('id, status, field_id').in('slot_id', todaySlotIds)
    : { data: [] };

  const totalBookings = allTodayBookings?.length ?? 0;
  const confirmedBookings = allTodayBookings?.filter(b => b.status === 'confirmed').length ?? 0;
  const revenue = (allTodayBookings ?? [])
    .filter(b => b.status === 'confirmed' || b.status === 'done')
    .reduce((sum, b) => sum + Number(fieldMap[b.field_id]?.price_per_hour ?? 0), 0)
    .toFixed(3);

  const STAT_CARDS = [
    {
      label: 'حجوزات اليوم',
      value: totalBookings,
      sub: `${confirmedBookings} مؤكد`,
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
      value: `${revenue} د.ك`,
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
      value: openSlots,
      sub: 'في اليوم',
      bg: 'bg-amber-50',
      textColor: 'text-amber-700',
      icon: (
        <svg className="w-6 h-6 lg:w-9 lg:h-9 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <RealtimeRefresher />

      <div className="mb-6 lg:mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-3xl font-extrabold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm lg:text-base mt-0.5">
            {new Date().toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          مباشر
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 lg:gap-5 mb-6 lg:mb-8">
        {STAT_CARDS.map(card => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-4 lg:p-6`}>
            <div className="flex items-start justify-between mb-2 lg:mb-4">
              {card.icon}
            </div>
            <p className={`text-2xl lg:text-4xl font-extrabold ${card.textColor}`}>{card.value}</p>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1">{card.label}</p>
            <p className="text-xs lg:text-sm text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Today's bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 lg:px-6 py-4 lg:py-5 border-b border-gray-100">
          <h2 className="font-bold lg:text-xl text-gray-900">حجوزات اليوم</h2>
          <Link href="/admin/bookings" className="text-green-600 text-sm lg:text-base font-semibold hover:text-green-700">
            عرض الكل
          </Link>
        </div>

        {todayBookings.length === 0 ? (
          <div className="text-center py-12 lg:py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400 text-sm lg:text-base">لا توجد حجوزات اليوم</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {todayBookings.map(booking => {
              const field = fieldMap[booking.field_id];
              const slot = slotMap[booking.slot_id];
              return (
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
                        {field?.name_ar ?? '—'} •{' '}
                        {slot ? `${formatTime12(slot.start_time.slice(0, 5))} — ${formatTime12(slot.end_time.slice(0, 5))}` : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mr-3">
                    <Badge status={booking.status as BookingStatus} />
                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-4 lg:mt-6 grid grid-cols-2 gap-3 lg:gap-5">
        <Link
          href="/admin/slots"
          className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-6 flex items-center gap-3 lg:gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 lg:w-14 lg:h-14 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 lg:w-7 lg:h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm lg:text-base font-bold text-gray-900">إدارة المواعيد</p>
            <p className="text-xs lg:text-sm text-gray-400">فتح وإغلاق الأوقات</p>
          </div>
        </Link>
        <Link
          href="/book"
          className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-6 flex items-center gap-3 lg:gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-10 h-10 lg:w-14 lg:h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 lg:w-7 lg:h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-sm lg:text-base font-bold text-gray-900">حجز جديد</p>
            <p className="text-xs lg:text-sm text-gray-400">إنشاء حجز يدوي</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
