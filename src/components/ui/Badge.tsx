import type { BookingStatus } from '@/lib/types';

const statusConfig: Record<BookingStatus, { label: string; classes: string }> = {
  pending: { label: 'قيد الانتظار', classes: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'مؤكد', classes: 'bg-green-100 text-green-700' },
  done: { label: 'مكتمل', classes: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'ملغي', classes: 'bg-red-100 text-red-600' },
};

export default function Badge({ status }: { status: BookingStatus }) {
  const { label, classes } = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}
