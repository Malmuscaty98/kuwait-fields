import Link from 'next/link';

const NAV = [
  { href: '/admin', label: 'لوحة التحكم', icon: (
    <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )},
  { href: '/admin/bookings', label: 'الحجوزات', icon: (
    <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { href: '/admin/slots', label: 'المواعيد', icon: (
    <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-l border-gray-100 fixed inset-y-0 right-0 z-30">
        <div className="h-20 flex items-center px-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" />
                <path d="M12 2 L12 22 M2 12 L22 12" stroke="white" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-none">ملاعب الكويت</p>
              <p className="text-xs text-gray-400 mt-0.5">لوحة الإدارة</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-5 border-t border-gray-100">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            العودة للموقع
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 lg:mr-72">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" />
                <path d="M12 2 L12 22 M2 12 L22 12" stroke="white" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm">الإدارة</span>
          </Link>
        </div>

        <main className="p-4 lg:p-10">{children}</main>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-40">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-gray-500 hover:text-green-600 transition-colors"
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="h-16 lg:hidden" />
      </div>
    </div>
  );
}
