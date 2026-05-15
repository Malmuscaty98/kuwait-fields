'use client';
import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type Review = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
  userId: string;
};

type ReviewsData = {
  reviews: Review[];
  avgRating: number;
  totalCount: number;
  currentUserReviewId: string | null;
  currentUserCanReview: boolean;
};

type SortKey = 'newest' | 'highest' | 'lowest';

function Stars({ value, size = 'sm', interactive = false, onChange }: {
  value: number;
  size?: 'sm' | 'lg';
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'lg' ? 'w-8 h-8' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= (hovered || value);
        return (
          <svg
            key={i}
            className={`${sz} transition-colors ${filled ? 'text-yellow-400' : 'text-gray-200'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            fill={filled ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            onClick={() => interactive && onChange?.(i)}
            onMouseEnter={() => interactive && setHovered(i)}
            onMouseLeave={() => interactive && setHovered(0)}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      })}
    </div>
  );
}

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function formatReviewDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ClubReviews({ clubAr }: { clubAr: string }) {
  const [data, setData]       = useState<ReviewsData | null>(null);
  const [sort, setSort]       = useState<SortKey>('newest');
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [formError, setFormError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchReviews = useCallback(async () => {
    const res = await fetch(`/api/reviews?club=${encodeURIComponent(clubAr)}`);
    if (res.ok) setData(await res.json());
  }, [clubAr]);

  useEffect(() => {
    setData(null);
    setShowAll(false);
    setShowForm(false);
    fetchReviews();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubAr]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formRating === 0) { setFormError('يرجى اختيار عدد النجوم'); return; }
    setFormError('');
    setSubmitting(true);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ club_ar: clubAr, rating: formRating, comment: formComment }),
    });
    const json = await res.json();
    if (!res.ok) { setFormError(json.error ?? 'حدث خطأ'); setSubmitting(false); return; }
    setShowForm(false);
    setFormRating(0);
    setFormComment('');
    setSubmitting(false);
    fetchReviews();
  }

  async function handleDelete(reviewId: string) {
    if (!confirm('حذف تقييمك؟')) return;
    await fetch(`/api/reviews?id=${reviewId}`, { method: 'DELETE' });
    fetchReviews();
  }

  if (!data) {
    return (
      <div className="px-4 lg:px-6 py-6 border-t border-gray-100">
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  // Sort reviews
  const sorted = [...data.reviews].sort((a, b) => {
    if (sort === 'highest') return b.rating - a.rating;
    if (sort === 'lowest')  return a.rating - b.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const displayed = showAll ? sorted : sorted.slice(0, 3);

  return (
    <div className="border-t border-gray-100">
      {/* ── Header: avg rating + write button ── */}
      <div className="px-4 lg:px-6 pt-5 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Big avg rating */}
            <div className="text-center">
              <p className="text-4xl font-extrabold text-gray-900 leading-none">
                {data.totalCount > 0 ? data.avgRating.toFixed(1) : '—'}
              </p>
              <div className="mt-1.5">
                <Stars value={Math.round(data.avgRating)} size="sm" />
              </div>
              <p className="text-xs text-gray-400 mt-1">{data.totalCount} تقييم</p>
            </div>

            {/* Rating bars */}
            {data.totalCount > 0 && (
              <div className="space-y-1 min-w-[120px]">
                {[5,4,3,2,1].map(star => {
                  const cnt = data.reviews.filter(r => r.rating === star).length;
                  const pct = data.totalCount > 0 ? (cnt / data.totalCount) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-2">{star}</span>
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-300 w-4">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Write review button */}
          {!data.currentUserReviewId && data.currentUserCanReview && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-yellow-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              قيّم النادي
            </button>
          )}
          {!currentUserId && data.totalCount === 0 && (
            <p className="text-xs text-gray-400">سجّل دخول واحجز لتتمكن من التقييم</p>
          )}
        </div>
      </div>

      {/* ── Write review form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mx-4 lg:mx-6 mb-5 bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-gray-800">أضف تقييمك</h3>
          <div>
            <p className="text-sm text-gray-600 mb-2">تقييمك</p>
            <Stars value={formRating} size="lg" interactive onChange={setFormRating} />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">تعليقك (اختياري)</p>
            <textarea
              value={formComment}
              onChange={e => setFormComment(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="شاركنا تجربتك في هذا النادي..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
            />
            <p className="text-xs text-gray-300 text-left mt-1">{formComment.length}/1000</p>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-yellow-500 text-white font-bold py-3 rounded-xl hover:bg-yellow-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'إرسال التقييم'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* ── Sort + Reviews list ── */}
      {data.totalCount > 0 && (
        <div className="px-4 lg:px-6 pb-5">
          {/* Sort tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
            {([
              { key: 'newest',  label: 'الأحدث' },
              { key: 'highest', label: 'الأعلى تقييماً' },
              { key: 'lowest',  label: 'الأدنى تقييماً' },
            ] as { key: SortKey; label: string }[]).map(s => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  sort === s.key
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Review cards */}
          <div className="space-y-3">
            {displayed.map(review => (
              <div key={review.id} className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {review.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{review.userName}</p>
                      <p className="text-xs text-gray-400">{formatReviewDate(review.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Stars value={review.rating} size="sm" />
                    {review.userId === currentUserId && (
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors p-1"
                        title="حذف تقييمك"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>

          {/* Show more */}
          {sorted.length > 3 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 w-full text-sm text-gray-500 hover:text-green-600 font-semibold py-2.5 border border-gray-200 rounded-xl hover:border-green-300 transition-colors"
            >
              عرض جميع التقييمات ({sorted.length})
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {data.totalCount === 0 && !showForm && (
        <div className="px-4 lg:px-6 pb-6 text-center">
          <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-sm text-gray-400">لا توجد تقييمات بعد — كن أول من يقيّم هذا النادي!</p>
        </div>
      )}
    </div>
  );
}
