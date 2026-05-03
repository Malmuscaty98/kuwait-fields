'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import type { Booking, BookingStatus, Field, Slot } from '@/lib/types';

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

export default function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then(r => r.json())
      .then(async (b: Booking) => {
        setBooking(b);
        const [f, s] = await Promise.all([
          fetch(`/api/fields?id=${b.fieldId}`).then(r => r.json()),
          fetch(`/api/slots/${b.slotId}`).then(r => r.json()),
        ]);
        setField(f);
        setSlot(s);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: BookingStatus) {
    if (!booking) return;
    setUpdating(true);
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBooking(updated);
    }
    setUpdating(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse w-1/3" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">😕</p>
        <p className="text-gray-500 mb-4">الحجز غير موجود</p>
        <Link href="/admin/bookings" className="text-green-600 font-semibold">العودة للحجوزات</Link>
      </div>
    );
  }

  const canConfirm = booking.status === 'pending';
  const canDone = booking.status === 'confirmed';
  const canCancel = booking.status !== 'cancelled' && booking.status !== 'done';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/bookings" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">تفاصيل الحجز</h1>
          <p className="text-xs font-mono text-gray-400" dir="ltr">{booking.ref}</p>
        </div>
        <div className="mr-auto">
          <Badge status={booking.status} />
        </div>
      </div>

      <div className="space-y-4 max-w-lg">
        {/* Field + Slot */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">تفاصيل الملعب والموعد</p>

          {field && (
            <div className={`h-24 bg-gradient-to-br ${field.gradient} rounded-xl flex items-end p-4`}>
              <div>
                <p className="text-white font-bold text-lg">{field.nameAr}</p>
                <p className="text-white/70 text-sm">{field.locationAr}</p>
              </div>
            </div>
          )}

          {slot && (
            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-green-800">
                  {formatTime12(slot.startTime)} — {formatTime12(slot.endTime)}
                </p>
                <p className="text-xs text-green-600">{formatDateAr(slot.date)}</p>
              </div>
            </div>
          )}

          {field && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">تكلفة الحجز</span>
              <div>
                <span className="text-xl font-extrabold text-green-600">{field.pricePerHour}</span>
                <span className="text-gray-400 text-sm"> د.ك</span>
              </div>
            </div>
          )}
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">بيانات العميل</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold">{booking.customerName.charAt(0)}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{booking.customerName}</p>
                <p className="text-sm text-gray-400" dir="ltr">{booking.phone}</p>
              </div>
            </div>
            {booking.notes && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">ملاحظات</p>
                <p className="text-sm text-gray-700">{booking.notes}</p>
              </div>
            )}
            <p className="text-xs text-gray-400">
              تاريخ الحجز: {new Date(booking.createdAt).toLocaleDateString('ar-KW', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">الإجراءات</p>
          <div className="space-y-2">
            {canConfirm && (
              <button
                onClick={() => updateStatus('confirmed')}
                disabled={updating}
                className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                تأكيد الحجز
              </button>
            )}
            {canDone && (
              <button
                onClick={() => updateStatus('done')}
                disabled={updating}
                className="w-full bg-gray-700 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                وضع علامة مكتمل
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => {
                  if (confirm('هل أنت متأكد من إلغاء هذا الحجز؟')) updateStatus('cancelled');
                }}
                disabled={updating}
                className="w-full border border-red-200 text-red-500 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                إلغاء الحجز
              </button>
            )}
            {!canConfirm && !canDone && !canCancel && (
              <p className="text-center text-gray-400 text-sm py-2">لا توجد إجراءات متاحة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
