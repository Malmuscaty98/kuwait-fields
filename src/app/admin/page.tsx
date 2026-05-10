import Link from 'next/link';
import RealtimeDashboard from '@/components/RealtimeDashboard';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const dateLabel = new Date().toLocaleDateString('ar-KW', {
    timeZone: 'Asia/Kuwait',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-3xl font-extrabold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm lg:text-base mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          مباشر
        </div>
      </div>

      {/* Realtime stats + bookings list */}
      <RealtimeDashboard />

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
