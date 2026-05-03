'use client';
import type { Slot } from '@/lib/types';

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

interface Props {
  slots: Slot[];
  selected: string | null;
  onSelect: (slotId: string) => void;
}

export default function TimeSlotGrid({ slots, selected, onSelect }: Props) {
  if (slots.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-8">
        لا توجد مواعيد متاحة لهذا اليوم
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-3">
      {slots.map(slot => {
        const isBooked = !!slot.bookingId;
        const isClosed = !slot.isOpen;
        const isDisabled = isBooked || isClosed;
        const isSelected = slot.id === selected;

        return (
          <button
            key={slot.id}
            disabled={isDisabled}
            onClick={() => !isDisabled && onSelect(slot.id)}
            className={`slot-pill px-2 py-2.5 lg:py-3 rounded-xl border text-xs lg:text-sm font-semibold text-center focus:outline-none transition-all ${
              isSelected
                ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-200'
                : isDisabled
                ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-700 hover:bg-green-50'
            }`}
          >
            <div>{formatTime(slot.startTime)}</div>
            <div className="opacity-70">{formatTime(slot.endTime)}</div>
            {isClosed && !isBooked && (
              <div className="text-[10px] text-gray-400 mt-0.5">مغلق</div>
            )}
            {isBooked && (
              <div className="text-[10px] text-gray-400 mt-0.5">محجوز</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
