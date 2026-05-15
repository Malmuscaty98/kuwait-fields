'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { eloTier } from '@/lib/elo';

type Booking = {
  id: string;
  ref: string;
  status: string;
  createdAt: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  fieldNameAr: string | null;
  fieldLocationAr: string | null;
  fieldImageUrl: string | null;
};

type ProfileData = {
  profile: { fullName: string; email: string; role: string; createdAt: string };
  stats: {
    totalBookings: number;
    upcomingCount: number;
    favouriteField: { nameAr: string; locationAr: string; imageUrl?: string } | null;
  };
  bookings: Booking[];
};

type TeamData = {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
};

type MatchResult = {
  challengerScore: number | null;
  opponentScore: number | null;
  isDraw: boolean | null;
  winnerTeamId: string | null;
  challengerConfirmed: boolean;
  opponentConfirmed: boolean;
  eloApplied: boolean;
  challengerPeerRating: number | null;
  opponentPeerRating: number | null;
};

type MatchRow = {
  id: string;
  status: string;
  isChallenger: boolean;
  slot: { date: string; startTime: string; endTime: string } | null;
  field: { nameAr: string; locationAr: string } | null;
  challenger: { id: string; name: string; elo: number } | null;
  opponent:   { id: string; name: string; elo: number } | null;
  matchResult: MatchResult | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'مؤكد',         color: 'bg-green-100 text-green-700' },
  done:      { label: 'منتهي',         color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'ملغي',          color: 'bg-red-100 text-red-600' },
};

const DAY_NAMES_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MONTHS_AR   = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${DAY_NAMES_AR[d.getDay()]} ${d.getDate()} ${MONTHS_AR[d.getMonth()]}`;
}
function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/* ──────────────── Match result submission form ──────────────── */
function MatchResultForm({ matchId, isChallenger, onDone }: { matchId: string; isChallenger: boolean; onDone: () => void }) {
  const [cScore, setCScore] = useState('');
  const [oScore, setOScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cs = parseInt(cScore, 10);
    const os = parseInt(oScore, 10);
    if (isNaN(cs) || isNaN(os) || cs < 0 || os < 0) { setErr('أدخل نتيجة صحيحة'); return; }
    setSubmitting(true);
    setErr('');
    const res = await fetch(`/api/challenges/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengerScore: cs, opponentScore: os }),
    });
    const d = await res.json();
    if (!res.ok) { setErr(d.error ?? 'خطأ'); setSubmitting(false); return; }
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500">تسجيل النتيجة</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-[10px] text-gray-400 mb-1">{isChallenger ? 'فريقك (متحدي)' : 'المتحدي'}</p>
          <input
            type="number" min="0" max="99"
            value={cScore}
            onChange={e => setCScore(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-center text-lg font-extrabold focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <span className="text-gray-400 font-bold text-lg flex-shrink-0">—</span>
        <div className="flex-1 text-center">
          <p className="text-[10px] text-gray-400 mb-1">{isChallenger ? 'المنافس' : 'فريقك (منافس)'}</p>
          <input
            type="number" min="0" max="99"
            value={oScore}
            onChange={e => setOScore(e.target.value)}
            placeholder="0"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-center text-lg font-extrabold focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-orange-500 text-white text-sm font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400"
      >
        {submitting ? 'جارٍ التسجيل...' : 'تسجيل النتيجة'}
      </button>
      <p className="text-[10px] text-gray-400 text-center">
        سيتم تأكيد النتيجة بعد موافقة كلا الفريقين وتحديث ELO تلقائياً.
      </p>
    </form>
  );
}

/* ──────────────── Peer rating form ──────────────── */
function PeerRatingForm({ matchId, onDone }: { matchId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (rating < 1) return;
    setSubmitting(true);
    setErr('');
    const res = await fetch(`/api/challenges/${matchId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    const d = await res.json();
    if (!res.ok) { setErr(d.error ?? 'خطأ'); setSubmitting(false); return; }
    onDone();
  }

  const display = hovered || rating;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500">قيّم الفريق المنافس (من ١٠)</p>
      <div className="flex items-center gap-1 justify-center">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(n)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
              n <= display ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-orange-100'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="text-center">
          <p className="text-sm text-gray-600">تقييمك: <strong className="text-orange-600">{rating}/10</strong></p>
        </div>
      )}
      {err && <p className="text-xs text-red-500 text-center">{err}</p>}
      <button
        onClick={submit}
        disabled={submitting || rating < 1}
        className="w-full bg-orange-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-orange-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400"
      >
        {submitting ? 'جارٍ الإرسال...' : 'إرسال التقييم'}
      </button>
    </div>
  );
}

/* ──────────────── Single match card ──────────────── */
function MatchCard({ match, myTeamId, onRefresh }: { match: MatchRow; myTeamId: string; onRefresh: () => void }) {
  const [showResultForm, setShowResultForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  const mr = match.matchResult;
  const opponent = match.isChallenger ? match.opponent : match.challenger;
  const opponentTier = opponent ? eloTier(opponent.elo) : null;

  const myConfirmed = match.isChallenger ? mr?.challengerConfirmed : mr?.opponentConfirmed;
  const myPeerRating = match.isChallenger ? mr?.challengerPeerRating : mr?.opponentPeerRating;

  const matchDate = match.slot?.date ?? '';
  const today = new Date().toISOString().split('T')[0];
  const isPast = matchDate < today;

  // Status chip
  const challengeStatusMap: Record<string, { label: string; color: string }> = {
    open:      { label: 'مفتوح',   color: 'bg-orange-100 text-orange-700' },
    accepted:  { label: 'مقبول',   color: 'bg-green-100 text-green-700' },
    completed: { label: 'منتهي',   color: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'ملغي',    color: 'bg-red-100 text-red-600' },
  };
  const cs = challengeStatusMap[match.status] ?? { label: match.status, color: 'bg-gray-100 text-gray-600' };

  // If completed, show result
  let resultLine: string | null = null;
  if (mr && mr.eloApplied) {
    if (mr.isDraw) resultLine = `تعادل · ${mr.challengerScore} — ${mr.opponentScore}`;
    else if (mr.winnerTeamId === myTeamId) resultLine = `فوز ✅ · ${mr.challengerScore} — ${mr.opponentScore}`;
    else resultLine = `خسارة ❌ · ${mr.challengerScore} — ${mr.opponentScore}`;
  } else if (mr && (mr.challengerScore !== null || mr.opponentScore !== null)) {
    resultLine = `${mr.challengerScore ?? '?'} — ${mr.opponentScore ?? '?'} (في انتظار التأكيد)`;
  }

  return (
    <li className="p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900 text-sm">
            {match.field?.nameAr ?? 'ملعب'}
          </p>
          <p className="text-xs text-gray-400">{match.field?.locationAr}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${cs.color}`}>
          {cs.label}
        </span>
      </div>

      {/* Date/time */}
      {match.slot && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDate(match.slot.date)} · {formatTime(match.slot.startTime)} — {formatTime(match.slot.endTime)}
        </div>
      )}

      {/* Opponent */}
      {opponent && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {opponent.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{opponent.name}</p>
            <div className="flex items-center gap-1.5">
              {opponentTier && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${opponentTier.color}`}>
                  {opponentTier.label}
                </span>
              )}
              <span className="text-[10px] text-gray-400">ELO {opponent.elo}</span>
            </div>
          </div>
          <span className="mr-auto text-xs text-gray-400">
            {match.isChallenger ? 'منافس' : 'متحدي'}
          </span>
        </div>
      )}

      {/* Result */}
      {resultLine && (
        <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 text-center">
          {resultLine}
        </div>
      )}

      {/* Action: submit result (after match, accepted, not yet confirmed by me) */}
      {match.status === 'accepted' && isPast && !myConfirmed && !showResultForm && (
        <button
          onClick={() => setShowResultForm(true)}
          className="w-full bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold py-2.5 rounded-xl hover:bg-orange-100 transition-colors"
        >
          ⚽ تسجيل نتيجة المباراة
        </button>
      )}
      {showResultForm && !myConfirmed && (
        <MatchResultForm
          matchId={match.id}
          isChallenger={match.isChallenger}
          onDone={() => { setShowResultForm(false); onRefresh(); }}
        />
      )}
      {myConfirmed && match.status !== 'completed' && (
        <p className="text-xs text-gray-400 text-center">✓ سجّلت النتيجة — في انتظار تأكيد الفريق الآخر</p>
      )}

      {/* Peer rating (after completed, not yet rated) */}
      {match.status === 'completed' && myPeerRating === null && !showRatingForm && (
        <button
          onClick={() => setShowRatingForm(true)}
          className="w-full bg-orange-50 border border-orange-200 text-orange-700 text-sm font-bold py-2.5 rounded-xl hover:bg-orange-100 transition-colors"
        >
          ⭐ قيّم الفريق المنافس
        </button>
      )}
      {showRatingForm && (
        <PeerRatingForm
          matchId={match.id}
          onDone={() => { setShowRatingForm(false); onRefresh(); }}
        />
      )}
      {match.status === 'completed' && myPeerRating !== null && (
        <p className="text-xs text-gray-400 text-center">⭐ قيّمت الفريق المنافس بـ {myPeerRating}/10</p>
      )}

      {/* Open: show link */}
      {match.status === 'open' && (
        <Link
          href={`/challenges/${match.id}`}
          className="block text-center text-xs text-orange-600 font-semibold hover:underline"
        >
          رابط التحدي ←
        </Link>
      )}
    </li>
  );
}

/* ──────────────── Main profile page ──────────────── */
export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'matches'>('upcoming');
  const [apiError, setApiError] = useState(false);

  // Team & matches
  const [team, setTeam] = useState<TeamData | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  async function loadMatches() {
    setMatchesLoading(true);
    const res = await fetch('/api/teams/matches');
    if (res.ok) setMatches(await res.json());
    setMatchesLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) { router.replace('/auth/login?next=/profile'); return; }

      Promise.all([
        fetch('/api/profile').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch('/api/teams').then(r => r.ok ? r.json() : null),
        fetch('/api/teams/matches').then(r => r.ok ? r.json() : []),
      ])
        .then(([profileData, teamData, matchesData]) => {
          if (cancelled) return;
          setData(profileData);
          if (teamData?.id) setTeam(teamData);
          setMatches(matchesData ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) { setApiError(true); setLoading(false); }
        });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (apiError) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">تعذّر تحميل الملف الشخصي</h2>
        <p className="text-gray-400 text-sm mb-4">يرجى المحاولة مرة أخرى</p>
        <button
          onClick={() => { setApiError(false); setLoading(true); window.location.reload(); }}
          className="bg-green-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );

  if (!data) return null;

  const today = new Date().toISOString().split('T')[0];
  const upcoming    = data.bookings.filter(b => b.date && b.date >= today && b.status !== 'cancelled');
  const past        = data.bookings.filter(b => !b.date || b.date < today || b.status === 'cancelled');
  const displayList = tab === 'upcoming' ? upcoming : past;

  const initials = data.profile.fullName.charAt(0).toUpperCase() || '؟';
  const tier = team ? eloTier(team.elo) : null;
  const activeMatches    = matches.filter(m => m.status === 'accepted' || m.status === 'open');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" />
                <path d="M12 2 L12 22 M2 12 L22 12" stroke="white" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <span className="font-extrabold text-gray-900 text-sm">ملاعب الكويت</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/book" className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">احجز الآن</Link>
            <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-red-500 transition-colors">خروج</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Profile hero */}
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-3xl p-6 text-white shadow-lg shadow-green-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-inner">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold leading-tight">{data.profile.fullName || 'مرحباً!'}</h1>
              <p className="text-green-200 text-sm mt-0.5 truncate">{data.profile.email}</p>
              <p className="text-green-300 text-xs mt-1">
                عضو منذ {new Date(data.profile.createdAt).toLocaleDateString('ar-KW', { year: 'numeric', month: 'long' })}
              </p>
            </div>
            <Link
              href="/book"
              className="flex-shrink-0 bg-white text-green-700 text-sm font-bold px-4 py-2.5 rounded-2xl hover:bg-green-50 transition-colors shadow-sm"
            >
              احجز
            </Link>
          </div>
        </div>

        {/* Booking stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-gray-900">{data.stats.totalBookings}</p>
            <p className="text-xs text-gray-400 mt-1 leading-tight">إجمالي الحجوزات</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-green-600">{data.stats.upcomingCount}</p>
            <p className="text-xs text-gray-400 mt-1 leading-tight">قادمة</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-gray-900">{data.stats.totalBookings - data.stats.upcomingCount}</p>
            <p className="text-xs text-gray-400 mt-1 leading-tight">منتهية</p>
          </div>
        </div>

        {/* Team card */}
        {team && tier && (
          <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-extrabold text-white shadow-inner">
                {team.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-white font-extrabold text-base leading-tight">⚽ {team.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
                  <span className="text-white/80 text-xs">ELO {team.elo}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x divide-gray-100 rtl:divide-x-reverse">
              {[
                { label: 'المباريات', val: team.totalMatches, color: 'text-gray-800' },
                { label: 'فوز',       val: team.wins,         color: 'text-green-600' },
                { label: 'تعادل',     val: team.draws,        color: 'text-gray-500' },
                { label: 'خسارة',     val: team.losses,       color: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="text-center py-3">
                  <p className={`text-xl font-extrabold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No team yet */}
        {!team && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl">⚔️</span>
            <div>
              <p className="font-bold text-orange-800">انضم لنظام التحديات</p>
              <p className="text-sm text-orange-600 mt-0.5">
                عند حجزك ملعباً، فعّل خيار التحدي لإنشاء فريقك والمنافسة على تقييم ELO.
              </p>
              <Link href="/book" className="mt-2 inline-block text-orange-700 font-semibold text-sm underline">
                احجز وتحدّ ←
              </Link>
            </div>
          </div>
        )}

        {/* Favourite field */}
        {data.stats.favouriteField && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-4 pt-4 pb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h2 className="text-sm font-bold text-gray-700">الملعب المفضل</h2>
            </div>
            <div className="flex items-center gap-3 px-4 pb-4">
              {data.stats.favouriteField.imageUrl && (
                <div
                  className="w-16 h-16 rounded-xl bg-cover bg-center flex-shrink-0"
                  style={{ backgroundImage: `url(${data.stats.favouriteField.imageUrl})` }}
                />
              )}
              <div>
                <p className="font-bold text-gray-900">{data.stats.favouriteField.nameAr}</p>
                <p className="text-sm text-gray-400 mt-0.5">{data.stats.favouriteField.locationAr}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs: bookings + matches */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {([ 'upcoming', 'past', 'matches' ] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-bold transition-colors whitespace-nowrap px-2 ${
                  tab === t ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'upcoming' ? `القادمة (${upcoming.length})`
                 : t === 'past'    ? `السابقة (${past.length})`
                 :                   `التحديات (${matches.length})`}
              </button>
            ))}
          </div>

          {/* Bookings content */}
          {tab !== 'matches' && (
            displayList.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">
                  {tab === 'upcoming' ? 'لا توجد حجوزات قادمة' : 'لا توجد حجوزات سابقة'}
                </p>
                {tab === 'upcoming' && (
                  <Link href="/book" className="inline-block mt-3 text-sm font-bold text-green-600 hover:text-green-700">
                    احجز الآن ←
                  </Link>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {displayList.map(booking => {
                  const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <li key={booking.id} className="flex items-start gap-3 p-4">
                      <div
                        className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0 bg-green-100"
                        style={booking.fieldImageUrl ? { backgroundImage: `url(${booking.fieldImageUrl})` } : {}}
                      >
                        {!booking.fieldImageUrl && (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {booking.fieldNameAr ?? 'ملعب'}
                          </p>
                          <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{booking.fieldLocationAr}</p>
                        {booking.date && (
                          <p className="text-xs text-gray-600 mt-1 font-medium">
                            {formatDate(booking.date)}
                            {booking.startTime && ` · ${booking.startTime} - ${booking.endTime}`}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1 font-mono">{booking.ref}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {/* Matches content */}
          {tab === 'matches' && (
            matchesLoading ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-3">⚔️</p>
                <p className="text-gray-400 text-sm">لا توجد تحديات بعد</p>
                <Link href="/book" className="inline-block mt-3 text-sm font-bold text-orange-600 hover:text-orange-700">
                  ابدأ تحدياً ←
                </Link>
              </div>
            ) : (
              <>
                {activeMatches.length > 0 && (
                  <div>
                    <div className="px-4 pt-4 pb-1">
                      <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">نشطة ({activeMatches.length})</p>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {activeMatches.map(m => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          myTeamId={team?.id ?? ''}
                          onRefresh={() => loadMatches()}
                        />
                      ))}
                    </ul>
                  </div>
                )}
                {completedMatches.length > 0 && (
                  <div>
                    <div className="px-4 pt-4 pb-1 border-t border-gray-50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">منتهية ({completedMatches.length})</p>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {completedMatches.map(m => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          myTeamId={team?.id ?? ''}
                          onRefresh={() => loadMatches()}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )
          )}
        </div>

      </main>
    </div>
  );
}
