'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import DateChips from '@/components/DateChips';
import TimeSlotGrid from '@/components/TimeSlotGrid';
import CustomerAuthButton from '@/components/CustomerAuthButton';
import ClubReviews from '@/components/ClubReviews';
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

function SizeBadge({ size }: { size: string }) {
  const map: Record<string, string> = { '5v5': '٥×٥', '7v7': '٧×٧', '11v11': '١١×١١', 'half': 'نصف', 'full': 'كامل' };
  return (
    <span className="bg-black/30 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
      {map[size] ?? size}
    </span>
  );
}

function BookPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFieldId = searchParams.get('fieldId');

  const [fields, setFields]       = useState<Field[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(today());

  // slotsByField: { [fieldId]: Slot[] }
  const [slotsByField, setSlotsByField] = useState<Record<string, Slot[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Selected booking
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [selectedSlotId,  setSelectedSlotId]  = useState<string | null>(null);

  // Avg ratings per club (fetched alongside fields)
  const [avgRatings, setAvgRatings] = useState<Record<string, number>>({});

  // Derive clubs list (stable order from API)
  const clubs = [...new Map(fields.map(f => [f.clubAr, f])).keys()];
  const clubFields = fields.filter(f => f.clubAr === selectedClub);

  // Load fields + avg ratings for all clubs once
  useEffect(() => {
    fetch('/api/fields')
      .then(r => r.json())
      .then(async (data: Field[]) => {
        setFields(data);
        if (preselectedFieldId) {
          const pre = data.find((x: Field) => x.id === preselectedFieldId);
          if (pre) {
            setSelectedClub(pre.clubAr);
            setSelectedFieldId(pre.id);
            return;
          }
        }
        if (data.length > 0) {
          setSelectedClub(data[0].clubAr);
          setSelectedFieldId(data[0].id);
        }
        // Pre-fetch avg ratings for all unique clubs
        const uniqueClubs = [...new Set(data.map((f: Field) => f.clubAr))];
        const ratings: Record<string, number> = {};
        await Promise.all(uniqueClubs.map(async club => {
          try {
            const res = await fetch(`/api/reviews?club=${encodeURIComponent(club)}`);
            if (res.ok) {
              const json = await res.json();
              if (json.avgRating) ratings[club] = json.avgRating;
            }
          } catch { /* ignore */ }
        }));
        setAvgRatings(ratings);
      });
  }, [preselectedFieldId]);

  // Fetch slots for all fields of the selected club whenever club or date changes
  const fetchAllSlots = useCallback(async () => {
    if (!selectedClub || fields.length === 0) return;
    const fieldsInClub = fields.filter(f => f.clubAr === selectedClub);
    if (fieldsInClub.length === 0) return;
    setLoadingSlots(true);
    setSelectedSlotId(null);
    const results = await Promise.all(
      fieldsInClub.map(f =>
        fetch(`/api/slots?fieldId=${f.id}&date=${selectedDate}`).then(r => r.json())
      )
    );
    const map: Record<string, Slot[]> = {};
    fieldsInClub.forEach((f, i) => { map[f.id] = results[i]; });
    setSlotsByField(map);
    setLoadingSlots(false);
  }, [selectedClub, selectedDate, fields]);

  useEffect(() => { fetchAllSlots(); }, [fetchAllSlots]);

  // When club changes: reset selection and auto-pick first field of new club
  function handleClubChange(club: string) {
    setSelectedClub(club);
    setSelectedSlotId(null);
    const first = fields.find(f => f.clubAr === club);
    if (first) setSelectedFieldId(first.id);
  }

  const selectedField = fields.find(f => f.id === selectedFieldId);
  const selectedSlot  = slotsByField[selectedFieldId]?.find(s => s.id === selectedSlotId);

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
        <h1 className="font-bold text-gray-900 text-lg flex-1">اختر موعدك</h1>
        <CustomerAuthButton />
      </div>

      <div className="max-w-6xl mx-auto lg:flex lg:gap-6 lg:p-8">
        {/* ═══════════════════════ LEFT / MAIN PANEL ═══════════════════════ */}
        <div className="flex-1 min-w-0 space-y-0 lg:space-y-4">

          {/* ── ١. Club tabs ── */}
          <div className="bg-white border-b border-gray-100 lg:rounded-2xl lg:border px-4 lg:px-6 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">اختر النادي</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {clubs.map(club => {
                const isActive = club === selectedClub;
                const short = club.replace('نادي ', '');
                const avg = avgRatings[club];
                return (
                  <button
                    key={club}
                    onClick={() => handleClubChange(club)}
                    className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-green-600 border-green-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
                    }`}
                  >
                    <span>{short}</span>
                    {avg ? (
                      <span className={`flex items-center gap-0.5 text-[11px] font-semibold mt-0.5 ${isActive ? 'text-green-100' : 'text-yellow-500'}`}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {avg.toFixed(1)}
                      </span>
                    ) : (
                      <span className={`text-[10px] mt-0.5 ${isActive ? 'text-green-200' : 'text-gray-300'}`}>—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ٢. Date picker ── */}
          <div className="bg-white border-b border-gray-100 lg:rounded-2xl lg:border px-4 lg:px-6 py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">اختر التاريخ</p>
            <DateChips
              selected={selectedDate}
              onChange={d => { setSelectedDate(d); setSelectedSlotId(null); }}
            />
          </div>

          {/* ── ٣. One section per field in selected club ── */}
          {/* ── ٣. Fields ── */}
          {clubFields.map((field, _idx) => {
            const fieldSlots = slotsByField[field.id] ?? [];
            const isFieldSelected = field.id === selectedFieldId;
            const fieldSlotSelected = isFieldSelected ? selectedSlotId : null;
            const fieldNum = field.nameAr.split('-').pop()?.trim() ?? field.nameAr;

            return (
              <div
                key={field.id}
                className={`bg-white border-b border-gray-100 lg:rounded-2xl lg:border overflow-hidden transition-all ${
                  isFieldSelected && selectedSlotId ? 'ring-2 ring-green-500 ring-offset-0 lg:ring-offset-2' : ''
                }`}
              >
                {/* Field image banner */}
                <div className="relative h-40 lg:h-52 w-full bg-gray-200">
                  {field.imageUrl ? (
                    <Image
                      src={field.imageUrl}
                      alt={field.nameAr}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center">
                      <span className="text-5xl">⚽</span>
                    </div>
                  )}
                  {/* Gradient overlay + info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-4 flex items-end justify-between">
                    <div>
                      <p className="text-white font-extrabold text-lg leading-tight">{fieldNum}</p>
                      <p className="text-white/70 text-xs mt-0.5">{field.locationAr}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <SizeBadge size={field.size} />
                      <span className="bg-green-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                        {field.pricePerHour} د.ك / ساعة
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time slots */}
                <div className="px-4 lg:px-6 py-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    اختر الوقت
                  </p>
                  {loadingSlots ? (
                    <div className="grid grid-cols-3 gap-2 lg:gap-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <TimeSlotGrid
                      slots={fieldSlots}
                      selected={fieldSlotSelected}
                      onSelect={slotId => {
                        setSelectedFieldId(field.id);
                        setSelectedSlotId(slotId);
                      }}
                      onChallengeClick={challengeId => router.push(`/challenges/${challengeId}`)}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* ── ٤. Club Reviews section ── */}
          {selectedClub && (
            <div className="bg-white border-b border-gray-100 lg:rounded-2xl lg:border overflow-hidden">
              <div className="px-4 lg:px-6 pt-5 pb-1 flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h3 className="font-bold text-gray-800 text-sm">تقييمات {selectedClub}</h3>
              </div>
              <ClubReviews clubAr={selectedClub} />
            </div>
          )}
        </div>

        {/* ═══════════════════════ RIGHT / BOOKING PANEL ═══════════════════════ */}
        <div className="lg:w-80 xl:w-96 lg:flex-shrink-0">
          {/* Desktop sticky panel */}
          <div className="hidden lg:flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-20">
            {/* Selected field image */}
            <div className="relative h-44 w-full bg-gray-100">
              {selectedField?.imageUrl ? (
                <Image
                  src={selectedField.imageUrl}
                  alt={selectedField.nameAr}
                  fill
                  className="object-cover transition-all duration-300"
                  sizes="384px"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-green-600 to-emerald-800 flex items-center justify-center">
                  <span className="text-4xl">⚽</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {selectedField && (
                <div className="absolute bottom-3 right-4 left-4 flex items-end justify-between">
                  <div>
                    <p className="text-white font-extrabold text-base leading-tight">{selectedField.nameAr}</p>
                    <p className="text-white/70 text-xs mt-0.5">{selectedField.locationAr}</p>
                  </div>
                  <SizeBadge size={selectedField.size} />
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-gray-900">تفاصيل الحجز</h2>
                {selectedSlotId && (
                  <button onClick={() => setSelectedSlotId(null)} className="text-sm text-gray-400 hover:text-red-500">
                    إلغاء
                  </button>
                )}
              </div>

              {selectedField ? (
                <div className="space-y-4">
                  {/* Date & Time */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-700 font-medium">{formatDateAr(selectedDate)}</span>
                    </div>
                    {selectedSlot ? (
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-900 font-bold">
                          {formatTime12(selectedSlot.startTime)} — {formatTime12(selectedSlot.endTime)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic pr-6">لم يتم اختيار وقت بعد</p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-gray-500">المجموع</span>
                    <div>
                      <span className="text-3xl font-extrabold text-green-600">{selectedField.pricePerHour}</span>
                      <span className="text-gray-400 text-sm"> د.ك</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handleProceed}
                    disabled={!selectedSlotId}
                    className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {selectedSlotId ? 'متابعة الحجز ←' : 'اختر وقتاً أولاً'}
                  </button>

                  <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">🎧</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">نحن هنا للمساعدة</p>
                      <p className="text-xs text-gray-500 mt-0.5">اتصل بنا: 965-XXXX-XXXX</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Mobile bottom bar */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-40 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                {selectedField ? (
                  <>
                    <p className="text-xs text-gray-400 truncate">{selectedField.nameAr}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-green-600">{selectedField.pricePerHour}</span>
                      <span className="text-xs text-gray-400">د.ك</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">جارٍ التحميل...</p>
                )}
              </div>
              <button
                onClick={handleProceed}
                disabled={!selectedSlotId}
                className="flex-1 bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {selectedSlotId ? 'متابعة الحجز ←' : 'اختر وقتاً'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile spacer */}
      <div className="h-24 lg:hidden" />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BookPageContent />
    </Suspense>
  );
}
