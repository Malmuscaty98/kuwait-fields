import Link from 'next/link';

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; reason?: string }>;
}) {
  const { ref, reason } = await searchParams;

  const reasonMap: Record<string, string> = {
    CANCELLED: 'تم إلغاء عملية الدفع',
    FAILED: 'فشلت عملية الدفع',
    DECLINED: 'تم رفض البطاقة',
    TIMEDOUT: 'انتهت مهلة الدفع',
  };
  const reasonText = reason ? (reasonMap[reason] ?? 'لم تكتمل عملية الدفع') : 'لم تكتمل عملية الدفع';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-xl font-extrabold text-gray-900 mb-2">لم يكتمل الدفع</h1>
        <p className="text-gray-500 text-sm mb-1">{reasonText}</p>
        {ref && (
          <p className="text-xs text-gray-400 mb-6 font-mono" dir="ltr">ref: {ref}</p>
        )}

        <p className="text-sm text-gray-500 mb-6">
          تم إلغاء حجزك. يمكنك المحاولة مجدداً باختيار موعد جديد.
        </p>

        <div className="space-y-3">
          <Link
            href="/book"
            className="block w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition-colors"
          >
            حاول مجدداً
          </Link>
          <Link
            href="/"
            className="block w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
