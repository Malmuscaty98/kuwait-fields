'use client';

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

interface DateChip {
  dateStr: string;
  dayName: string;
  dayNum: number;
  monthShort: string;
  isToday: boolean;
}

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNext14Days(): DateChip[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      dateStr:    localDateStr(d),
      dayName:    DAY_NAMES_AR[d.getDay()],
      dayNum:     d.getDate(),
      monthShort: MONTHS_AR[d.getMonth()],
      isToday:    i === 0,
    };
  });
}

interface Props {
  selected: string;
  onChange: (dateStr: string) => void;
}

export default function DateChips({ selected, onChange }: Props) {
  const days = getNext14Days();

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {days.map(day => {
        const isSelected = day.dateStr === selected;
        return (
          <button
            key={day.dateStr}
            onClick={() => onChange(day.dateStr)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-[68px] py-3 rounded-2xl border transition-all duration-150 focus:outline-none ${
              isSelected
                ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-200'
                : 'bg-white border-gray-200 text-gray-700 hover:border-green-400 hover:text-green-700'
            }`}
          >
            <span className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-green-100' : 'text-gray-500'}`}>
              {day.dayName}
            </span>
            <span className="text-xl font-extrabold leading-tight mt-0.5">{day.dayNum}</span>
            {day.isToday ? (
              <span className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-green-100' : 'text-green-600'}`}>
                اليوم
              </span>
            ) : (
              <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-green-200' : 'text-gray-400'}`}>
                {day.monthShort}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
