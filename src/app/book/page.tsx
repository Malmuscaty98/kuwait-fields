'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DateChips from '@/components/DateChips';
import TimeSlotGrid from '@/components/TimeSlotGrid';
import type { Field, Slot } from '@/lib/types';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateAr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-KW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function BookPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFieldId = searchParams.get('fieldId');

  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(preselectedFieldId ?? '');
  const [selectedDate, setSelectedDate] = useState(today());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    fetch('/api/fields')
      .then(r => r.json())
      .then((data: Field[]) => {
        setFields(data);
        if (!preselectedFieldId && data.length > 0) {
          setSelectedFieldId(data[0].id);
        }
      });
  }, [preselectedFieldId]);

  const fetchSlots = useCallback(async () => {
    if (!selectedFieldId || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlotId(null);
    const res = await fetch(`/api/slots?fieldId=${selectedFieldId}&date=${selectedDate}`);
    const data: Slot[] = await res.json();
    setSlots(data);
    setLoadingSlots(false);
  }, [selectedFieldId, selectedDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const selectedField = fields.find(f => f.id === selectedFieldId);
  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  function handleProceed() {
    if (!selectedFieldId || !selectedSlotId) return;
    router.push(`/book/form?fieldId=${selectedFieldId}&slotId=${selectedSlotId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <Link href="/" className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <h1 className="font-bold text-gray-900 text-lg">اختر موعدك</h1>
      </div>

      <div className="max-w-6xl mx-auto lg:flex lg:gap-6 lg:p-8">
        {/* Left / Main panel */}
        <div className="flex-1 min-w-0">
          {/* Field selector */}
          <div className="bg-white border-b border-gray-100 lg:rounded-2xl lg:border px-4 lg:px-6 py-4 lg:py-5 lg:mb-4">
            <p className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">اختر الملعب</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {fields.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedFieldId(f.id); setSelectedSlotId(null); }}
                  className={`flex-shrink-0 px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl border text-sm lg:text-base font-semibold transition-all ${
                    selectedFieldId === f.id
                      ? 'bg-green-600 border-green-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
                  }`}
                >
                  {f.nameAr}
                </button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <div className="bg-white border-b border-gray-100 lg:rounded-2xl lg:border px-4 lg:px-6 py-4 lg:py-5 lg:mb-4">
            <p className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">اختر التاريخ</p>
            <DateChips
              selected={selectedDate}
              onChange={d => { setSelectedDate(d); setSelectedSlotId(null); }}
            />
          </div>

          {/* Time slots */}
          <div className="bg-white lg:rounded-2xl lg:border border-gray-100 px-4 lg:px-6 py-4 lg:py-5">
            <p className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">اختر الوقت</p>
            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2 lg:gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-14 lg:h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <TimeSlotGrid
                slots={slots}
                selected={selectedSlotId}
                onSelect={setSelectedSlotId}
              />
            )}
          </div>
        </div>

        {/* Right / Booking panel — desktop sidebar, mobile sticky bottom */}
        <div className="lg:w-88 lg:flex-shrink-0" style={{ width: undefined }}>
          {/* Desktop panel */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 p-6 sticky top-20 w-80 xl:w-96">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-gray-900">تفاصيل الحجز</h2>
              {selectedSlotId && (
                <button onClick={() => setSelectedSlotId(null)} className="text-sm text-gray-400 hover:text-gray-600">
                  تغيير
                </button>
              )}
            </div>

            {selectedField ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">الملعب</p>
                  <p className="font-bold text-base text-gray-900">{selectedField.nameAr}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-600 text-sm font-medium">{selectedField.locationAr}</span>
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-400 mb-1">التاريخ والوقت</p>
                  {selectedSlot ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-base font-semibold text-gray-900">
                        {formatTime12(selectedSlot.startTime)} — {formatTime12(selectedSlot.endTime)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">لم يتم اختيار وقت بعد</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{formatDateAr(selectedDate)}</p>
                </div>

                <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                  <span className="text-gray-500 text-base">المجموع</span>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-green-600">{selectedField.pricePerHour}</span>
                    <span className="text-gray-400 text-base"> د.ك</span>
                  </div>
                </div>

                <button
                  onClick={handleProceed}
                  disabled={!selectedSlotId}
                  className="w-full bg-green-600 text-white font-bold py-4 text-base rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {selectedSlotId ? 'متابعة الحجز ←' : 'اختر وقتاً أولاً'}
                </button>

                <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎧</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">نحن هنا للمساعدة</p>
                    <p className="text-sm text-gray-500 mt-0.5">اتصل بنا: 965-XXXX-XXXX</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-base">جارٍ تحميل الملاعب...</p>
            )}
          </div>

          {/* Mobile bottom bar */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-40">
            <div className="flex items-center justify-between gap-4">
              <div>
                {selectedField && (
                  <>
                    <p className="text-xs text-gray-400">{selectedField.nameAr}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-green-600">{selectedField.pricePerHour}</span>
                      <span className="text-xs text-gray-400">د.ك / ساعة</span>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleProceed}
                disabled={!selectedSlotId}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {selectedSlotId ? 'متابعة الحجز ←' : 'اختر وقتاً'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="h-24 lg:hidden" />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <BookPageContent />
    </Suspense>
  );
}
