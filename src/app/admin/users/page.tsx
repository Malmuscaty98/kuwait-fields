'use client';
import { useEffect, useState, useCallback } from 'react';

type UserRow = {
  userId:        string;
  email:         string;
  fullName:      string;
  role:          'customer' | 'admin';
  disabled:      boolean;
  createdAt:     string;
  totalBookings: number;
};

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS_AR[dt.getMonth()]} ${dt.getFullYear()}`;
}

function Avatar({ name, disabled }: { name: string; disabled: boolean }) {
  const initial = name?.trim()[0]?.toUpperCase() ?? '?';
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${
      disabled ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'
    }`}>
      {initial}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter]     = useState<'all' | 'customer' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [toggling, setToggling]   = useState<string | null>(null);
  const [confirm, setConfirm]     = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      role:   roleFilter,
      status: statusFilter,
    });
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) setUsers(await res.json());
    else setError('تعذر تحميل البيانات');
    setLoading(false);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function toggleDisabled(user: UserRow) {
    setToggling(user.userId);
    setConfirm(null);
    const res = await fetch('/api/admin/users', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: user.userId, disabled: !user.disabled }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.userId === user.userId ? { ...u, disabled: !u.disabled } : u
      ));
    }
    setToggling(null);
  }

  // Stats
  const total    = users.length;
  const active   = users.filter(u => !u.disabled).length;
  const disabled = users.filter(u => u.disabled).length;
  const admins   = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-sm text-gray-400 mt-0.5">عرض وإدارة جميع حسابات اللاعبين</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الحسابات', value: total,    color: 'text-gray-900',  icon: '👥' },
          { label: 'نشط',             value: active,   color: 'text-green-600', icon: '✅' },
          { label: 'معطّل',           value: disabled, color: 'text-red-500',   icon: '🚫' },
          { label: 'مدير',            value: admins,   color: 'text-blue-600',  icon: '🛡️' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{s.icon}</span>
            </div>
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد..."
            className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Role filter */}
        <div className="flex gap-1.5">
          {([
            { key: 'all',      label: 'الكل' },
            { key: 'customer', label: 'لاعب' },
            { key: 'admin',    label: 'مدير' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                roleFilter === f.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {([
            { key: 'all',      label: 'الكل'   },
            { key: 'active',   label: 'نشط'    },
            { key: 'disabled', label: 'معطّل'  },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                statusFilter === f.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

        {/* Desktop header */}
        <div className="hidden md:grid grid-cols-[2.5rem_1fr_1fr_6rem_6rem_5rem_7rem] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div />
          <div>الاسم</div>
          <div>البريد</div>
          <div className="text-center">الدور</div>
          <div className="text-center">الحجوزات</div>
          <div className="text-center">تاريخ التسجيل</div>
          <div className="text-center">الحالة</div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-48" />
                </div>
                <div className="h-7 bg-gray-100 rounded-xl w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-gray-400">لا توجد نتائج</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {users.map(user => (
              <li
                key={user.userId}
                className={`grid grid-cols-[2.5rem_1fr_auto] md:grid-cols-[2.5rem_1fr_1fr_6rem_6rem_5rem_7rem] gap-4 items-center px-5 py-4 hover:bg-gray-50 transition-colors ${
                  user.disabled ? 'opacity-60' : ''
                }`}
              >
                {/* Avatar */}
                <Avatar name={user.fullName} disabled={user.disabled} />

                {/* Name */}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {user.fullName || '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate md:hidden">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5 md:hidden">
                    {formatDate(user.createdAt)}
                  </p>
                </div>

                {/* Email (desktop) */}
                <p className="hidden md:block text-sm text-gray-500 truncate">{user.email}</p>

                {/* Role (desktop) */}
                <div className="hidden md:flex justify-center">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    user.role === 'admin'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.role === 'admin' ? '🛡️ مدير' : 'لاعب'}
                  </span>
                </div>

                {/* Bookings (desktop) */}
                <div className="hidden md:flex justify-center">
                  <span className="text-sm font-bold text-gray-700">{user.totalBookings}</span>
                </div>

                {/* Date (desktop) */}
                <p className="hidden md:block text-xs text-gray-400 text-center">
                  {formatDate(user.createdAt)}
                </p>

                {/* Action */}
                <div className="flex justify-end md:justify-center">
                  {user.role === 'admin' ? (
                    <span className="text-xs text-gray-300 font-medium">—</span>
                  ) : (
                    <button
                      onClick={() => setConfirm(user)}
                      disabled={toggling === user.userId}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
                        user.disabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                    >
                      {toggling === user.userId ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : user.disabled ? 'تفعيل' : 'تعطيل'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              confirm.disabled ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className="text-2xl">{confirm.disabled ? '✅' : '🚫'}</span>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-extrabold text-gray-900">
                {confirm.disabled ? 'تفعيل الحساب' : 'تعطيل الحساب'}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                هل أنت متأكد من {confirm.disabled ? 'تفعيل' : 'تعطيل'} حساب
                <br />
                <span className="font-semibold text-gray-800">{confirm.fullName || confirm.email}</span>؟
              </p>
              {!confirm.disabled && (
                <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-xl px-3 py-2">
                  لن يتمكن المستخدم من تسجيل الدخول بعد التعطيل
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => toggleDisabled(confirm)}
                className={`flex-1 text-white font-bold py-3 rounded-xl transition-colors ${
                  confirm.disabled
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {confirm.disabled ? 'تفعيل' : 'تعطيل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
