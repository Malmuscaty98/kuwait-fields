import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getFields } from '@/lib/store';

const FEATURES = [
  { icon: '⚡', title: 'حجز فوري', desc: 'احجز ملعبك في ثوانٍ معدودة بدون انتظار أو مكالمات' },
  { icon: '🏟️', title: 'ملاعب مميزة', desc: 'أفضل الملاعب المجهزة بالكويت بمعدات احترافية' },
  { icon: '🕐', title: 'مواعيد مرنة', desc: 'احجز من الصباح وحتى منتصف الليل على مدار الأسبوع' },
];

const STEPS = [
  { num: '١', title: 'اختر الملعب', desc: 'تصفح ملاعبنا واختر الأنسب لك' },
  { num: '٢', title: 'اختر الوقت', desc: 'حدد اليوم والساعة المناسبة' },
  { num: '٣', title: 'احجز والعب', desc: 'سجّل بياناتك وتأكيد الحجز فوري' },
];

export default function LandingPage() {
  const fields = getFields();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-700 to-emerald-500" />
        {/* Field lines decoration */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <rect x="20" y="20" width="360" height="260" fill="none" stroke="white" strokeWidth="3" />
            <line x1="200" y1="20" x2="200" y2="280" stroke="white" strokeWidth="2" />
            <circle cx="200" cy="150" r="50" fill="none" stroke="white" strokeWidth="2" />
            <rect x="20" y="100" width="60" height="100" fill="none" stroke="white" strokeWidth="2" />
            <rect x="320" y="100" width="60" height="100" fill="none" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            الكويت&apos;s #1 Football Booking Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
            احجز ملعبك
            <br />
            <span className="text-green-300">وانطلق اللعب</span>
          </h1>
          <p className="text-lg md:text-xl text-green-100 max-w-xl mx-auto mb-10">
            أسهل طريقة لحجز ملاعب كرة القدم في الكويت — بضغطة واحدة
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="bg-white text-green-700 font-bold text-lg px-8 py-4 rounded-2xl hover:bg-green-50 transition-colors shadow-lg"
            >
              احجز الآن ⚽
            </Link>
            <a
              href="#fields"
              className="border-2 border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              تعرف على الملاعب
            </a>
          </div>
          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[['٣+', 'ملاعب'], ['٧٠٠+', 'حجز شهرياً'], ['٤.٩', 'تقييم المستخدمين']].map(([num, label]) => (
              <div key={label} className="bg-white/15 backdrop-blur-sm rounded-2xl py-4 px-2">
                <div className="text-2xl font-extrabold">{num}</div>
                <div className="text-xs text-green-100">{label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Wave */}
        <div className="relative">
          <svg viewBox="0 0 1440 60" className="w-full block" preserveAspectRatio="none">
            <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">لماذا ملاعب الكويت؟</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-green-50 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fields */}
      <section id="fields" className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ملاعبنا</h2>
          <p className="text-gray-500 mb-8">اختر من بين أفضل الملاعب في مناطق مختلفة بالكويت</p>
          <div className="grid md:grid-cols-3 gap-6">
            {fields.map(field => (
              <div key={field.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 group">
                {/* Field image / gradient */}
                <div className={`h-44 bg-gradient-to-br ${field.gradient} relative flex items-end p-4`}>
                  <div className="absolute inset-0 opacity-20">
                    <svg viewBox="0 0 200 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                      <rect x="10" y="10" width="180" height="130" fill="none" stroke="white" strokeWidth="2" />
                      <line x1="100" y1="10" x2="100" y2="140" stroke="white" strokeWidth="1.5" />
                      <circle cx="100" cy="75" r="28" fill="none" stroke="white" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="relative bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                    {field.size === '5v5' ? '٥ × ٥' : field.size === '7v7' ? '٧ × ٧' : '١١ × ١١'}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-lg">{field.nameAr}</h3>
                  <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {field.locationAr}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {field.features.slice(0, 3).map(feat => (
                      <span key={feat} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        {feat}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-2xl font-extrabold text-green-600">{field.pricePerHour}</span>
                      <span className="text-gray-400 text-sm"> د.ك / ساعة</span>
                    </div>
                    <Link
                      href={`/book?fieldId=${field.id}`}
                      className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors group-hover:shadow-md"
                    >
                      احجز
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">كيف يعمل؟</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-green-600 text-white text-2xl font-extrabold rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-200">
                  {step.num}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 right-0 w-full border-t-2 border-dashed border-green-200 -z-10" />
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/book"
              className="inline-block bg-green-600 text-white font-bold text-lg px-10 py-4 rounded-2xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
            >
              ابدأ الحجز الآن ⚽
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2" />
                <path d="M12 2 L12 22 M2 12 L22 12" stroke="white" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <span className="font-bold">ملاعب الكويت</span>
          </div>
          <p className="text-gray-400 text-sm text-center">
            © 2025 ملاعب الكويت — احجز ملعبك بكل سهولة
          </p>
          <Link href="/admin" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
            لوحة الإدارة
          </Link>
        </div>
      </footer>
    </div>
  );
}
