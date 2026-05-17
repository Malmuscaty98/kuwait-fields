'use client';
import { useEffect, useState } from 'react';
import { eloTier } from '@/lib/elo';

type TeamRow = {
  rank: number;
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
  avgPeerRating: number | null;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
};

function WinRate({ wins, total }: { wins: number; total: number }) {
  const pct = total > 0 ? Math.round((wins / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-500 w-8">{pct}٪</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
      {rank}
    </span>
  );
}

export default function AdminChallengesPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'elo' | 'wins' | 'matches' | 'rating'>('elo');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/leaderboard')
      .then(r => r.json())
      .then(d => { setTeams(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setError('تعذر تحميل البيانات'); setLoading(false); });
  }, []);

  const sorted = [...teams]
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.ownerName.includes(search))
    .sort((a, b) => {
      if (sortBy === 'elo')     return b.elo - a.elo;
      if (sortBy === 'wins')    return b.wins - a.wins;
      if (sortBy === 'matches') return b.totalMatches - a.totalMatches;
      if (sortBy === 'rating')  return (b.avgPeerRating ?? 0) - (a.avgPeerRating ?? 0);
      return 0;
    })
    .map((t, i) => ({ ...t, rank: i + 1 }));

  // Summary stats
  const totalTeams   = teams.length;
  const totalMatches = teams.reduce((s, t) => s + t.wins + t.losses + t.draws, 0) / 2;
  const topElo       = teams[0]?.elo ?? 0;

  return (
    <div className="space-y-6" dir="rtl">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">⚔️ ترتيب الفرق</h1>
          <p className="text-sm text-gray-400 mt-0.5">جميع الفرق التي خاضت تحدياً واحداً على الأقل</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن فريق..."
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-52"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'إجمالي الفرق',    value: totalTeams,                     color: 'text-orange-600', icon: '⚽' },
          { label: 'مباريات ملعوبة',  value: Math.floor(totalMatches),       color: 'text-green-600',  icon: '🏆' },
          { label: 'أعلى ELO',        value: topElo,                          color: 'text-blue-600',   icon: '📈' },
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

      {/* Sort tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'elo',     label: 'ELO' },
          { key: 'wins',    label: 'الانتصارات' },
          { key: 'matches', label: 'المباريات' },
          { key: 'rating',  label: 'التقييم' },
        ] as const).map(s => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              sortBy === s.key
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="w-10 h-10 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
              <div className="h-8 bg-gray-100 rounded-xl w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-6 text-center">
          {error}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="text-gray-500 font-medium">لا توجد فرق بعد</p>
          <p className="text-gray-400 text-sm mt-1">ستظهر الفرق هنا بعد خوض أول تحدي</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[3rem_1fr_6rem_8rem_8rem_6rem_6rem] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div className="text-center">#</div>
            <div>الفريق</div>
            <div className="text-center">ELO</div>
            <div className="text-center">ف / ت / خ</div>
            <div>نسبة الفوز</div>
            <div className="text-center">المباريات</div>
            <div className="text-center">التقييم</div>
          </div>

          <ul className="divide-y divide-gray-50">
            {sorted.map(team => {
              const tier = eloTier(team.elo);
              const isExpanded = expanded === team.id;

              return (
                <li key={team.id}>
                  {/* Main row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : team.id)}
                    className="w-full text-right"
                  >
                    <div className="grid grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1fr_6rem_8rem_8rem_6rem_6rem] gap-4 items-center px-5 py-4 hover:bg-gray-50 transition-colors">

                      {/* Rank */}
                      <div className="flex justify-center">
                        <RankBadge rank={team.rank} />
                      </div>

                      {/* Team */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-base flex-shrink-0 ${
                          team.rank === 1 ? 'bg-yellow-400' :
                          team.rank === 2 ? 'bg-gray-400' :
                          team.rank === 3 ? 'bg-amber-600' :
                          'bg-orange-500'
                        }`}>
                          {team.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{team.name}</p>
                          <p className="text-xs text-gray-400 truncate">{team.ownerName}</p>
                        </div>
                      </div>

                      {/* ELO (desktop) */}
                      <div className="hidden md:flex flex-col items-center gap-1">
                        <span className="font-extrabold text-gray-900 text-base">{team.elo}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tier.color}`}>
                          {tier.label}
                        </span>
                      </div>

                      {/* W/D/L (desktop) */}
                      <div className="hidden md:flex items-center justify-center gap-1.5 text-sm font-bold">
                        <span className="text-green-600">{team.wins}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-500">{team.draws}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-red-500">{team.losses}</span>
                      </div>

                      {/* Win rate (desktop) */}
                      <div className="hidden md:block">
                        <WinRate wins={team.wins} total={team.totalMatches} />
                      </div>

                      {/* Total matches (desktop) */}
                      <div className="hidden md:flex justify-center">
                        <span className="text-sm font-bold text-gray-700">{team.totalMatches}</span>
                      </div>

                      {/* Peer rating */}
                      <div className="hidden md:flex justify-center">
                        {team.avgPeerRating !== null ? (
                          <span className="flex items-center gap-1 text-sm font-bold text-orange-600">
                            <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                            {team.avgPeerRating}/10
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>

                      {/* Mobile: ELO only */}
                      <div className="md:hidden flex flex-col items-end gap-1">
                        <span className="font-extrabold text-gray-900">{team.elo}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tier.color}`}>
                          {tier.label}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="bg-orange-50/60 border-t border-orange-100 px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">البريد الإلكتروني</p>
                        <p className="text-sm font-semibold text-gray-700 break-all">{team.ownerEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">إجمالي المباريات</p>
                        <p className="text-sm font-semibold text-gray-700">{team.totalMatches} مباراة</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">نسبة الفوز</p>
                        <p className="text-sm font-semibold text-green-600">
                          {team.totalMatches > 0 ? Math.round((team.wins / team.totalMatches) * 100) : 0}٪
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">تاريخ التسجيل</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {new Date(team.createdAt).toLocaleDateString('ar-KW', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-2">سجل ف / ت / خ</p>
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-extrabold text-green-600">{team.wins}</p>
                            <p className="text-[10px] text-gray-400">فوز</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-extrabold text-gray-500">{team.draws}</p>
                            <p className="text-[10px] text-gray-400">تعادل</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-extrabold text-red-500">{team.losses}</p>
                            <p className="text-[10px] text-gray-400">خسارة</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">متوسط تقييم الفرق المنافسة</p>
                        <p className="text-sm font-semibold text-orange-600">
                          {team.avgPeerRating !== null ? `${team.avgPeerRating} / 10` : 'لا يوجد تقييم بعد'}
                        </p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
