import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" />
              <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M19 5 L5 19" stroke="white" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-base">ملاعب الكويت</span>
        </Link>
        <Link
          href="/book"
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors"
        >
          احجز الآن
        </Link>
      </div>
    </nav>
  );
}
