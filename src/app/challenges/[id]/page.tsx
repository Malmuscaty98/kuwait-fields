'use client';
import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { eloTier } from '@/lib/elo';

type TeamInfo = {
  id: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
};

type ChallengeDetail = {
  id: string;
  status: 'open' | 'accepted' | 'completed' | 'cancelled';
  slot: { date: string; startTime: string; endTime: string } | null;
  field: { nameAr: string; locationAr: string; imageUrl?: string; pricePerHour: number } | null;
  challengerTeam: TeamInfo | null;
  opponentTeam: TeamInfo | null;
  challengerTeamId: string;
};

const DAY_NAMES_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function formatDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return `${DAY_NAMES_AR[dt.getDay()]} ${dt.getDate()} ${MONTHS_AR[dt.getMonth()]}`;
}
function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function TeamCard({ team, color }: { team: TeamInfo; color: 'orange' | 'green' }) {
  const tier = eloTier(team.elo);
  const bg = color === 'orange' ? 'bg-orange-50' : 'bg-green-50';
  const avatar = color === 'orange' ? 'bg-orange-500' : 'bg-green-500';
  return (
    <div className={`flex-1 ${bg} rounded-2xl p-4 text-center`}>
      <div className={`w-14 h-14 ${avatar} rounded-full flex items-center justify-center mx-auto mb-2`}>
        <span className="text-white text-2xl font-black">{team.name[0]?.toUpperCase() ?? '?'}</span>
      </div>
      <p className="font-bold text-gray-900 text-sm truncate">{team.name}</p>
      <p className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full inline-block ${tier.color}`}>{tier.label}</p>
      <p className="text-xs text-gray-500 mt-0.5">ELO {team.elo}</p>
      <div className="flex justify-center gap-3 mt-2 text-xs">
        <span className="text-green-600 font-semibold">{team.wins}ف</span>
        <span className="text-gray-400">{team.draws}ت</span>
        <span className="text-red-500 font-semibold">{team.losses}خ</span>
      </div>
    </div>
  );
}

function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const justCreated = searchParams.get('created') === '1';

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Accept flow
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [myTeamName, setMyTeamName] = useState('');
  const [existingTeamName, setExistingTeamName] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [isChallengerOwner, setIsChallengerOwner] = useState(false);

  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  // Load challenge
  useEffect(() => {
    fetch(`/api/challenges/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setFetchError(d.error);
        else setChallenge({ ...d, challengerTeamId: d.challengerTeam?.id });
        setLoading(false);
      })
      .catch(() => { setFetchError('تعذر تحميل التحدي'); setLoading(false); });
  }, [id]);

  // Auth check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setIsLoggedIn(true);
      const res = await fetch('/api/teams');
      if (!cancelled && res.ok) {
        const team = await res.json();
        if (team?.name) { setExistingTeamName(team.name); setMyTeamId(team.id); }
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // Determine if current user is the challenger
  useEffect(() => {
    if (!challenge?.challengerTeamId || !myTeamId) return;
    if (myTeamId === challenge.challengerTeamId) setIsChallengerOwner(true);
  }, [challenge, myTeamId]);

  async function handleAccept() {
    if (!isLoggedIn) {
      router.push(`/auth/login?next=/challenges/${id}`);
      return;
    }
    setAccepting(true);
    setAcceptError('');
    const res = await fetch(`/api/challenges/${id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName: existingTeamName ?? myTeamName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAcceptError(data.error ?? 'حدث خطأ');
      setAccepting(false);
    } else {
      setAccepted(true);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (fetchError || !challenge) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl mb-3">❌</p>
        <p className="text-gray-600 mb-4">{fetchError || 'التحدي غير موجود'}</p>
        <Link href="/book" className="text-orange-600 font-semibold underline">العودة للحجز</Link>
      </div>
    </div>
  );

  const statusMap = {
    open:      { label: 'مفتوح',  color: 'bg-orange-100 text-orange-700' },
    accepted:  { label: 'مقبول',  color: 'bg-green-100 text-green-700' },
    completed: { label: 'منتهي',  color: 'bg-gray-100 text-gray-600' },
    cancelled: { label: 'ملغي',   color: 'bg-red-100 text-red-600' },
  };
  const statusInfo = statusMap[challenge.status];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <Link href="/book" className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <h1 className="font-bold text-gray-900 text-lg flex-1">⚔️ تحدي</h1>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Just-created banner */}
        {justCreated && challenge.status === 'open' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-orange-800">تم نشر التحدي!</p>
              <p className="text-sm text-orange-600 mt-0.5">
                سيظهر موعدك باللون البرتقالي للمستخدمين الآخرين. سيُؤكد الحجز فور قبول فريق آخر.
              </p>
            </div>
          </div>
        )}

        {/* Match info */}
        {challenge.field && challenge.slot && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">تفاصيل المباراة</p>
            <div className="flex items-center gap-3 bg-orange-50 rounded-xl p-4">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-lg font-black">⚽</div>
              <div>
                <p className="font-bold text-gray-900">{challenge.field.nameAr}</p>
                <p className="text-sm text-gray-500">{challenge.field.locationAr}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">التاريخ</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5">{formatDate(challenge.slot.date)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">الوقت</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5">
                  {formatTime(challenge.slot.startTime)} — {formatTime(challenge.slot.endTime)}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-100">
              <span className="text-gray-500 text-sm">التكلفة (لكل فريق)</span>
              <div>
                <span className="text-xl font-extrabold text-orange-600">{challenge.field.pricePerHour}</span>
                <span className="text-gray-400 text-sm"> د.ك</span>
              </div>
            </div>
          </div>
        )}

        {/* Teams VS */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">الفرق</p>
          <div className="flex items-center gap-4">
            {challenge.challengerTeam && <TeamCard team={challenge.challengerTeam} color="orange" />}
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-500 font-black text-sm">VS</span>
            </div>
            {challenge.opponentTeam ? (
              <TeamCard team={challenge.opponentTeam} color="green" />
            ) : (
              <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center">
                <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-gray-400 text-2xl">?</span>
                </div>
                <p className="text-gray-400 text-sm font-medium">في انتظار منافس</p>
              </div>
            )}
          </div>
        </div>

        {/* Accept section (open + not challenger) */}
        {challenge.status === 'open' && !isChallengerOwner && (
          <div className="bg-white rounded-2xl border border-orange-200 p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">قبول التحدي</p>

            {accepted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-5 text-center">
                <p className="text-3xl mb-2">🏆</p>
                <p className="font-bold text-green-800">تم قبول التحدي!</p>
                <p className="text-sm text-green-600 mt-1">تم تأكيد الحجز. حظاً موفقاً في المباراة!</p>
                <Link href="/profile" className="mt-3 inline-block text-green-700 font-semibold underline text-sm">
                  عرض مبارياتي
                </Link>
              </div>
            ) : (
              <>
                <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm text-orange-700 flex items-start gap-2">
                  <span>ℹ️</span>
                  <p>بقبولك، توافق على مواجهة هذا الفريق في الموعد المحدد. تُسجَّل النتيجة وتُحدَّث تقييمات ELO بعد المباراة.</p>
                </div>

                {!isLoggedIn ? (
                  <Link
                    href={`/auth/login?next=/challenges/${id}`}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors"
                  >
                    تسجيل الدخول للقبول
                  </Link>
                ) : (
                  <>
                    {!existingTeamName && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          اسم فريقك <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={myTeamName}
                          onChange={e => setMyTeamName(e.target.value)}
                          placeholder="مثال: نسور الكويت"
                          maxLength={60}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                        />
                      </div>
                    )}
                    {existingTeamName && (
                      <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-500">فريقك</p>
                        <p className="font-bold text-gray-800 mt-0.5">⚽ {existingTeamName}</p>
                      </div>
                    )}
                    {acceptError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                        {acceptError}
                      </div>
                    )}
                    <button
                      onClick={handleAccept}
                      disabled={accepting || (!existingTeamName && myTeamName.trim().length < 2)}
                      className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {accepting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          جارٍ القبول...
                        </>
                      ) : '⚔️ قبول التحدي'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Challenger owns this open challenge */}
        {challenge.status === 'open' && isChallengerOwner && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl">📢</span>
            <div>
              <p className="font-bold text-orange-800">تحديك مفتوح</p>
              <p className="text-sm text-orange-600 mt-0.5">
                يظهر موعدك باللون البرتقالي للمستخدمين الآخرين. سيُؤكد الحجز فور قبول أحدهم.
              </p>
            </div>
          </div>
        )}

        {/* Accepted */}
        {challenge.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-bold text-green-800">التحدي مقبول!</p>
              <p className="text-sm text-green-600 mt-0.5">
                توجّه لملفك الشخصي بعد المباراة لتسجيل النتيجة وتحديث تقييم ELO.
              </p>
              <Link href="/profile" className="mt-2 inline-block text-green-700 font-semibold underline text-sm">
                الملف الشخصي ←
              </Link>
            </div>
          </div>
        )}

        {/* Completed */}
        {challenge.status === 'completed' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl">🏁</span>
            <div>
              <p className="font-bold text-gray-700">انتهت المباراة</p>
              <p className="text-sm text-gray-500 mt-0.5">تم تسجيل النتيجة وتحديث تقييمات ELO.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChallengePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChallengePage />
    </Suspense>
  );
}
