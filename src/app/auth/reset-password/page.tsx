'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword]           = useState('');
  const [confirm, setConfirm]             = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);
  const [sessionReady, setSessionReady]   = useState(false);
  const [sessionError, setSessionError]   = useState(false);

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  // Supabase يضع الـ recovery token في URL hash — نستمع لـ onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // إذا كان المستخدم وصل عبر رابط الإيميل، Supabase يُطلق الحدث تلقائياً
    // نعطيه 3 ثوانٍ ثم نتحقق
    const timeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        setSessionError(true);
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمة المرور وتأكيدها غير متطابقتين');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError('حدث خطأ أثناء تحديث كلمة المرور، يرجى المحاولة مجدداً');
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/'), 2500);
  }

  // قوة كلمة المرور
  function strength(p: string): { level: number; label: string; color: string } {
    if (p.length === 0) return { level: 0, label: '', color: '' };
    if (p.length < 6)   return { level: 1, label: 'ضعيفة',    color: 'bg-red-400' };
    if (p.length < 8)   return { level: 2, label: 'مقبولة',   color: 'bg-yellow-400' };
    if (p.length < 12 || !/[0-9]/.test(p)) return { level: 3, label: 'جيدة', color: 'bg-blue-400' };
    return { level: 4, label: 'قوية', color: 'bg-green-500' };
  }

  const pw = strength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
              <svg viewBox="0 0 24 24" className="w-8 h-8">
                <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" />
                <path d="M12 2 L12 22 M2 12 L22 12" stroke="white" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-extrabold text-gray-900 leading-none">ملاعب الكويت</p>
              <p className="text-sm text-gray-400 mt-0.5">تعيين كلمة مرور جديدة</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-8">

          {/* نجاح */}
          {success && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">تم تحديث كلمة المرور!</h2>
              <p className="text-gray-500 text-sm">سيتم توجيهك للصفحة الرئيسية...</p>
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* خطأ في الجلسة */}
          {!success && sessionError && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">الرابط منتهي أو غير صالح</h2>
              <p className="text-gray-500 text-sm">يرجى طلب رابط استعادة جديد</p>
              <Link
                href="/auth/forgot-password"
                className="inline-block w-full text-center bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition-colors"
              >
                طلب رابط جديد
              </Link>
            </div>
          )}

          {/* تحميل — في انتظار تأكيد الجلسة */}
          {!success && !sessionError && !sessionReady && (
            <div className="text-center py-8 space-y-4">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 text-sm">جارٍ التحقق من الرابط...</p>
            </div>
          )}

          {/* نموذج إعادة التعيين */}
          {!success && !sessionError && sessionReady && (
            <>
              <div className="mb-7 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">كلمة مرور جديدة</h1>
                <p className="text-gray-400 mt-1 text-sm">اختر كلمة مرور قوية لحماية حسابك</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* كلمة المرور */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      dir="ltr"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all placeholder:text-gray-300 pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* مؤشر قوة كلمة المرور */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              i <= pw.level ? pw.color : 'bg-gray-100'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${
                        pw.level <= 1 ? 'text-red-500' :
                        pw.level === 2 ? 'text-yellow-500' :
                        pw.level === 3 ? 'text-blue-500' :
                        'text-green-600'
                      }`}>{pw.label}</p>
                    </div>
                  )}
                </div>

                {/* تأكيد كلمة المرور */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    dir="ltr"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-300 ${
                      confirm.length > 0 && confirm !== password
                        ? 'border-red-300 focus:ring-red-400'
                        : confirm.length > 0 && confirm === password
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-200 focus:ring-green-500'
                    }`}
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">كلمتا المرور غير متطابقتين</p>
                  )}
                  {confirm.length > 0 && confirm === password && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      متطابقتان
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || password !== confirm || password.length < 8}
                  className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      حفظ كلمة المرور الجديدة
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
