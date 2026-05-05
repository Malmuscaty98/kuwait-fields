import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { FieldSize } from '@/lib/types';

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

function formatDateAr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  if (!ref) return <NotFound />;

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('ref', ref)
    .single();

  if (!booking) return <NotFound />;

  const [{ data: slot }, { data: allFields }] = await Promise.all([
    supabase.from('slots').select('*').eq('id', booking.slot_id).single(),
    supabase.from('fields').select('*').order('created_at'),
  ]);

  if (!slot || !allFields) return <NotFound />;

  const fieldIndex = allFields.findIndex(f => f.id === booking.field_id);
  const fieldRaw = allFields[fieldIndex];
  if (!fieldRaw) return <NotFound />;

  const field = {
    nameAr: fieldRaw.name_ar as string,
    locationAr: fieldRaw.location_ar as string,
    pricePerHour: Number(fieldRaw.price_per_hour),
    size: (fieldRaw.size ?? 'full') as FieldSize,
    gradient: GRADIENTS[fieldIndex % GRADIENTS.length],
  };

  const startTime = (slot.start_time as string).slice(0, 5);
  const endTime = (slot.end_time as string).slice(0, 5);

  const sizeLabel =
    field.size === '5v5' ? '٥ × ٥' : field.size === '7v7' ? '٧ × ٧' : 'ملعب كامل';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center">
        <h1 className="font-bold text-gray-900 text-lg">تأكيد الحجز</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-4">
        {/* Success banner */}
        <div className="bg-green-600 rounded-2xl p-6 text-center text-white shadow-lg shadow-green-200">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold mb-1">تم تأكيد حجزك! 🎉</h2>
          <p className="text-green-100 text-sm">استعد للعب — ملعبك في انتظارك</p>
          <div className="mt-4 bg-white/20 rounded-xl py-3 px-4">
            <p className="text-xs text-green-100 mb-0.5">رقم الحجز</p>
            <p className="text-2xl font-extrabold tracking-widest" dir="ltr">{booking.ref}</p>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">تفاصيل الحجز</p>
          <div className="space-y-3">
            <DetailRow label="الملعب" value={field.nameAr} />
            <DetailRow label="الموقع" value={field.locationAr} />
            <DetailRow label="نوع الملعب" value={sizeLabel} />
            <div className="border-t border-gray-100 pt-3">
              <DetailRow label="التاريخ" value={formatDateAr(slot.date as string)} />
              <DetailRow label="الوقت" value={`${formatTime12(startTime)} — ${formatTime12(endTime)}`} />
            </div>
            <div className="border-t border-gray-100 pt-3">
              <DetailRow label="الاسم" value={booking.customer_name} />
              <DetailRow label="الهاتف" value={booking.phone} dir="ltr" />
            </div>
            {booking.notes && (
              <div className="border-t border-gray-100 pt-3">
                <DetailRow label="الملاحظات" value={booking.notes} />
              </div>
            )}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">المبلغ المدفوع</span>
              <div>
                <span className="text-2xl font-extrabold text-green-600">{field.pricePerHour.toFixed(3)}</span>
                <span className="text-gray-400 text-sm"> د.ك</span>
              </div>
            </div>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">ماذا بعد؟</p>
          <div className="space-y-3">
            {[
              { icon: '📱', text: 'ستصلك رسالة تأكيد على رقم هاتفك' },
              { icon: '🕐', text: 'احضر قبل موعدك بـ ١٠ دقائق' },
              { icon: '⚽', text: 'استمتع باللعب!' },
            ].map(step => (
              <div key={step.text} className="flex items-center gap-3">
                <span className="text-2xl">{step.icon}</span>
                <p className="text-sm text-gray-700">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🎧</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">هل تحتاج مساعدة؟</p>
            <p className="text-xs text-gray-500">تواصل معنا: 965-XXXX-XXXX</p>
          </div>
        </div>

        <Link
          href="/"
          className="block w-full text-center border-2 border-green-600 text-green-600 font-bold py-3.5 rounded-xl hover:bg-green-50 transition-colors"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-6xl mb-4">😕</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">الحجز غير موجود</h1>
      <p className="text-gray-500 mb-6 text-center">تعذر العثور على تفاصيل الحجز</p>
      <Link
        href="/book"
        className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors"
      >
        حجز جديد
      </Link>
    </div>
  );
}

function DetailRow({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-left" dir={dir}>{value}</span>
    </div>
  );
}
