'use client';
import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

interface Transaction {
  id: string;
  ref: string;
  tap_charge_id: string | null;
  status: string;
  customer_name: string;
  phone: string;
  created_at: string;
  field_id: string;
  slot_id: string;
  _fieldName?: string;
  _price?: number;
  _slotDate?: string;
  _slotStart?: string;
  _slotEnd?: string;
}

function formatTime12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateAr(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-KW', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-KW', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  confirmed: { label: 'مدفوع ✓',    bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  pending:   { label: 'قيد الانتظار', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  cancelled: { label: 'ملغي',        bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400' },
  done:      { label: 'مكتمل',       bg: 'bg-gray-100',  text: 'text-gray-600',   dot: 'bg-gray-400' },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    // Fetch all bookings that went through Tap (have tap_charge_id)
    const res = await fetch('/api/transactions');
    if (res.ok) {
      const data: Transaction[] = await res.json();
      setTransactions(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Realtime updates
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel('admin-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchTransactions();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTransactions]);

  const filtered = filterStatus === 'all'
    ? transactions
    : transactions.filter(t => t.status === filterStatus);

  // Summary stats
  const totalRevenue = transactions
    .filter(t => t.status === 'confirmed' || t.status === 'done')
    .reduce((sum, t) => sum + (t._price ?? 0), 0);

  const paidCount = transactions.filter(t => t.status === 'confirmed' || t.status === 'done').length;
  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const cancelledCount = transactions.filter(t => t.status === 'cancelled').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-3xl font-extrabold text-gray-900">العمليات المدفوعة</h1>
        <p className="text-gray-500 text-sm lg:text-base mt-0.5">جميع معاملات Tap Payments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-green-50 rounded-2xl p-4 lg:p-5">
          <p className="text-xs text-gray-500 mb-1">إجمالي الإيرادات</p>
          <p className="text-2xl lg:text-3xl font-extrabold text-green-700">{totalRevenue.toFixed(3)}</p>
          <p className="text-xs text-gray-400">د.ك</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 lg:p-5">
          <p className="text-xs text-gray-500 mb-1">عمليات مكتملة</p>
          <p className="text-2xl lg:text-3xl font-extrabold text-blue-700">{paidCount}</p>
          <p className="text-xs text-gray-400">مدفوعة</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 lg:p-5">
          <p className="text-xs text-gray-500 mb-1">قيد الانتظار</p>
          <p className="text-2xl lg:text-3xl font-extrabold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-400">لم تُدفع بعد</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 lg:p-5">
          <p className="text-xs text-gray-500 mb-1">ملغية</p>
          <p className="text-2xl lg:text-3xl font-extrabold text-red-600">{cancelledCount}</p>
          <p className="text-xs text-gray-400">فشل الدفع</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex gap-2 flex-wrap">
        {[
          { value: 'all',       label: 'الكل' },
          { value: 'confirmed', label: 'مدفوع' },
          { value: 'pending',   label: 'قيد الانتظار' },
          { value: 'cancelled', label: 'ملغي' },
          { value: 'done',      label: 'مكتمل' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filterStatus === opt.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                </div>
                <div className="w-20 h-6 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">💳</p>
            <p className="text-gray-400 text-sm">لا توجد عمليات مطابقة</p>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden lg:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.2fr_auto] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>التاريخ</span>
              <span>العميل</span>
              <span>الملعب</span>
              <span>الموعد</span>
              <span>المبلغ</span>
              <span>رقم العملية</span>
              <span>الحالة</span>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.map(tx => {
                const s = STATUS_MAP[tx.status] ?? STATUS_MAP.pending;
                return (
                  <div
                    key={tx.id}
                    className="px-4 lg:px-6 py-4 lg:grid lg:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_1.2fr_auto] lg:gap-4 lg:items-center hover:bg-gray-50 transition-colors"
                  >
                    {/* Mobile layout */}
                    <div className="lg:hidden flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{tx.customer_name}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(tx.created_at)}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 ${s.bg} ${s.text} text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </div>
                    </div>
                    <div className="lg:hidden flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{tx._fieldName ?? '—'} • {tx._slotDate ? formatDateAr(tx._slotDate) : '—'}</span>
                      <span className="font-bold text-green-700 text-sm">{(tx._price ?? 0).toFixed(3)} د.ك</span>
                    </div>
                    {tx.tap_charge_id && (
                      <p className="lg:hidden text-[10px] text-gray-300 font-mono" dir="ltr">{tx.tap_charge_id}</p>
                    )}

                    {/* Desktop layout */}
                    <p className="hidden lg:block text-sm text-gray-500">{formatDateTime(tx.created_at)}</p>
                    <div className="hidden lg:block">
                      <p className="text-sm font-semibold text-gray-900">{tx.customer_name}</p>
                      <p className="text-xs text-gray-400" dir="ltr">{tx.phone}</p>
                    </div>
                    <p className="hidden lg:block text-sm text-gray-700">{tx._fieldName ?? '—'}</p>
                    <div className="hidden lg:block">
                      {tx._slotDate && <p className="text-sm text-gray-700">{formatDateAr(tx._slotDate)}</p>}
                      {tx._slotStart && tx._slotEnd && (
                        <p className="text-xs text-gray-400">{formatTime12(tx._slotStart)} — {formatTime12(tx._slotEnd)}</p>
                      )}
                    </div>
                    <p className="hidden lg:block text-sm font-bold text-green-700">{(tx._price ?? 0).toFixed(3)} د.ك</p>
                    <p className="hidden lg:block text-xs text-gray-300 font-mono truncate" dir="ltr">
                      {tx.tap_charge_id ?? '—'}
                    </p>
                    <div className={`hidden lg:flex items-center gap-1.5 ${s.bg} ${s.text} text-xs font-semibold px-2.5 py-1.5 rounded-full w-fit`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-3">
        {!loading && `${filtered.length} عملية`}
      </p>
    </div>
  );
}
