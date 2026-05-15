'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

export default function CustomerAuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  if (loading) {
    return <div className="w-24 h-9 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/login"
          className="text-sm font-semibold text-gray-600 hover:text-green-700 transition-colors px-3 py-2 rounded-xl hover:bg-green-50"
        >
          دخول
        </Link>
        <Link
          href="/auth/register"
          className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors px-4 py-2 rounded-xl shadow-sm shadow-green-200"
        >
          تسجيل
        </Link>
      </div>
    );
  }

  // Extract display name / initials
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'أنا';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-green-50 transition-colors"
      >
        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-green-200">
          {initials}
        </div>
        <span className="text-sm font-semibold text-gray-700 hidden sm:block max-w-[100px] truncate">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl shadow-gray-200 border border-gray-100 overflow-hidden z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100 bg-green-50">
            <p className="text-xs text-gray-400">مرحباً،</p>
            <p className="text-sm font-bold text-gray-800 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              ملفي الشخصي
            </Link>
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              حجز ملعب
            </Link>
          </div>

          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-right"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
