'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Field, Slot } from '@/lib/types';

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateAr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function BookFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fieldId = searchParams.get('fieldId') ?? '';
  const slotId = searchParams.get('slotId') ?? '';

  const [field, setField] = useState<Field | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fieldId) fetch(`/api/fields?id=${fieldId}`).then(r => r.json()).then(setField);
    if (slotId) fetch(`/api/slots/${slotId}`).then(r => r.json()).then(setSlot);
  }, [fieldId, slotId]);

  if (!fieldId || !slotId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">بيانات الحجز غير مكتملة</p>
          <Link href="/book" className="text-green-600 font-semibold">العودة للحجز</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1: Create booking (status: pending)
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, slotId, customerName: name.trim(), phone: phone.trim(), notes: notes.trim() }),
      });
      if (!bookingRes.ok) {
        const err = await bookingRes.json();
        setError(err.error ?? 'حدث خطأ، يرجى المحاولة مجدداً');
        setLoading(false);
        return;
      }
      const booking = await bookingRes.json();

      // Step 2: Initiate Tap payment
      const payRes = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      if (!payRes.ok) {
        const err = await payRes.json();
        setError(err.error ?? 'تعذر فتح صفحة الدفع، يرجى المحاولة مجدداً');
        setLoading(false);
        return;
      }
      const { paymentUrl } = await payRes.json();

      // Step 3: Redirect to Tap payment page
      window.location.href = paymentUrl;
    } catch {
      setError('حدث خطأ في الاتصال، يرجى المحاولة مجدداً');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <Link href="/book" className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">بيانات الحجز</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* Booking summary card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">ملخص الحجز</p>

          {field && slot ? (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{field.nameAr}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{field.locationAr}</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {field.size === '5v5' ? '٥×٥' : field.size === '7v7' ? '٧×٧' : '١١×١١'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 rounded-xl p-3">
                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {formatTime12(slot.startTime)} — {formatTime12(slot.endTime)}
                  </p>
                  <p className="text-xs text-green-600">{formatDateAr(slot.date)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-gray-500 text-sm">المبلغ الإجمالي</span>
                <div>
                  <span className="text-xl font-extrabold text-green-600">{field.pricePerHour}</span>
                  <span className="text-gray-400 text-sm"> د.ك</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-5 bg-gray-100 rounded animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-5 bg-gray-100 rounded animate-pulse" />
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">بيانات العميل</p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              الاسم الكامل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="أدخل اسمك الكامل"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="965XXXXXXXX"
              dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              required
            />
            <p className="text-xs text-gray-400 mt-1">سيتم إرسال تأكيد الحجز على هذا الرقم</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              ملاحظات <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي طلبات أو ملاحظات خاصة..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جارٍ التوجيه للدفع...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                الدفع الآن
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BookFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <BookFormContent />
    </Suspense>
  );
}
