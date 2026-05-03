'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Field, Slot } from '@/lib/types';

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getNext7Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      label: `${DAY_NAMES_AR[d.getDay()]} ${d.getDate()}`,
      isToday: i === 0,
    };
  });
}

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function AdminSlotsPage() {
  const days = getNext7Days();
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [selectedDate, setSelectedDate] = useState(days[0].dateStr);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/fields').then(r => r.json()).then((data: Field[]) => {
      setFields(data);
      if (data.length > 0) setSelectedFieldId(data[0].id);
    });
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!selectedFieldId || !selectedDate) return;
    setLoading(true);
    const res = await fetch(`/api/slots?fieldId=${selectedFieldId}&date=${selectedDate}`);
    const data: Slot[] = await res.json();
    setSlots(data);
    setLoading(false);
  }, [selectedFieldId, selectedDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  async function toggleSlot(slot: Slot) {
    setToggling(slot.id);
    await fetch(`/api/slots/${slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: !slot.isOpen }),
    });
    await fetchSlots();
    setToggling(null);
  }

  const openCount = slots.filter(s => s.isOpen && !s.bookingId).length;
  const bookedCount = slots.filter(s => s.bookingId).length;
  const closedCount = slots.filter(s => !s.isOpen).length;

  return (
    <div>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-3xl font-extrabold text-gray-900">إدارة المواعيد</h1>
        <p className="text-gray-500 text-sm lg:text-base mt-0.5">فتح وإغلاق المواعيد المتاحة للحجز</p>
      </div>

      {/* Field selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 mb-4 lg:mb-5">
        <p className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">الملعب</p>
        <div className="flex gap-2 lg:gap-3 overflow-x-auto scrollbar-hide pb-1">
          {fields.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFieldId(f.id)}
              className={`flex-shrink-0 px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl border text-sm lg:text-base font-semibold transition-all ${
                selectedFieldId === f.id
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
              }`}
            >
              {f.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* Day tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-5 mb-4 lg:mb-5">
        <p className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">التاريخ</p>
        <div className="flex gap-2 lg:gap-3 overflow-x-auto scrollbar-hide pb-1">
          {days.map(day => (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`flex-shrink-0 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl border text-xs lg:text-sm font-semibold transition-all ${
                selectedDate === day.dateStr
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-green-400'
              }`}
            >
              {day.label}
              {day.isToday && <span className="block text-[9px] lg:text-[11px] mt-0.5 opacity-70">اليوم</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {!loading && slots.length > 0 && (
        <div className="grid grid-cols-3 gap-3 lg:gap-5 mb-4 lg:mb-5">
          {[
            { label: 'متاح', value: openCount, color: 'bg-green-50 text-green-700' },
            { label: 'محجوز', value: bookedCount, color: 'bg-amber-50 text-amber-700' },
            { label: 'مغلق', value: closedCount, color: 'bg-gray-100 text-gray-600' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 lg:p-5 text-center`}>
              <p className="text-xl lg:text-3xl font-extrabold">{s.value}</p>
              <p className="text-xs lg:text-sm font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Slots list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 lg:px-6 py-4 lg:py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-sm lg:text-lg">المواعيد</h2>
          <p className="text-xs lg:text-sm text-gray-400">{slots.length} موعد</p>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4 lg:py-5 flex items-center gap-4">
                <div className="h-4 lg:h-5 bg-gray-100 rounded animate-pulse flex-1" />
                <div className="w-12 h-6 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-12 lg:py-16">
            <p className="text-3xl mb-3">🕐</p>
            <p className="text-gray-400 text-sm lg:text-base">لا توجد مواعيد لهذا اليوم</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {slots.map(slot => {
              const isBooked = !!slot.bookingId;
              const isToggling = toggling === slot.id;
              return (
                <div key={slot.id} className="flex items-center justify-between px-5 lg:px-6 py-3.5 lg:py-4">
                  <div>
                    <p className="text-sm lg:text-base font-semibold text-gray-900">
                      {formatTime12(slot.startTime)} — {formatTime12(slot.endTime)}
                    </p>
                    <p className={`text-xs lg:text-sm mt-0.5 ${
                      isBooked ? 'text-amber-600' :
                      slot.isOpen ? 'text-green-600' :
                      'text-gray-400'
                    }`}>
                      {isBooked ? 'محجوز' : slot.isOpen ? 'متاح للحجز' : 'مغلق'}
                    </p>
                  </div>
                  <button
                    onClick={() => !isBooked && toggleSlot(slot)}
                    disabled={isBooked || isToggling}
                    className={`relative inline-flex h-7 w-12 lg:h-8 lg:w-14 items-center rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed ${
                      slot.isOpen && !isBooked ? 'bg-green-600' : isBooked ? 'bg-amber-400' : 'bg-gray-200'
                    } ${isToggling ? 'opacity-50' : ''}`}
                    title={isBooked ? 'لا يمكن تعديل موعد محجوز' : slot.isOpen ? 'إغلاق الموعد' : 'فتح الموعد'}
                  >
                    <span
                      className={`inline-block h-5 w-5 lg:h-6 lg:w-6 transform rounded-full bg-white shadow transition-transform ${
                        slot.isOpen ? 'translate-x-1' : 'translate-x-6 lg:translate-x-7'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
