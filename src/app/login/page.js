'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { FaUserGraduate, FaLock, FaSignInAlt, FaExclamationCircle, FaRocket, FaStar, FaTrophy } from 'react-icons/fa';

export default function StudentLoginPage() {
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. تحويل الكود لإيميل تقني خلف الكواليس
      const technicalEmail = `${studentCode.trim().toLowerCase()}@center.com`;

      // 2. محاولة تسجيل الدخول
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: technicalEmail,
        password: password,
      });

      if (authError) throw new Error('بيانات الدخول غير صحيحة، تأكد من الكود وكلمة السر.');

      // 3. التحقق هل هذا المستخدم طالب فعلاً؟ مع فلترة حسب المركز
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, center_id')
        .eq('id', data.user.id)
        .single();

      if (studentError || !student) {
        await supabase.auth.signOut();
        throw new Error('عذراً، هذا الحساب ليس مسجلاً كطالب.');
      }

// 🛑 4. (جديد) التحقق من صلاحية باقة المركز (The Guard) 🛑
      const { data: centerFeatures, error: featureError } = await supabase
        .from('centers') // نفترض أن الجدول اسمه centers وفيه package_id
        .select(`
            package_id,
            packages (
                package_features (
                    feature_id
                )
            )
        `)
        .eq('id', student.center_id)
        .single();

      // ملاحظة: لو هيكلة الداتابيز عندك مختلفة (مثلاً features مربوطة بجدول تاني)، 
      // ممكن نستخدم دالة RPC أسرع، بس ده الحل الـ Standard.
      
      // استخراج الميزات في مصفوفة بسيطة
      const allowedFeatures = centerFeatures?.packages?.package_features?.map(pf => pf.feature_id) || [];
      const hasPortalAccess = allowedFeatures.includes('action_student_portal');

      if (!hasPortalAccess) {
          // 🚫 طرد الطالب لو السنتر مش دافع
          await supabase.auth.signOut();
          throw new Error('⛔ عذراً، خدمة المنصة متوقفة مؤقتاً لهذا المركز. يرجى مراجعة الإدارة لتجديد الاشتراك.');
      }

      // 4. تخزين center_id في localStorage للوصول السريع من الصفحات الأخرى
      localStorage.setItem('active_center_id', student.center_id);

      // 4. التوجه للداشبورد
     router.push('/portal/dashboard'); // تعديل المسار ليتطابق مع مكان الفولدر // تأكد من اسم المسار عندك

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      {/* Luxury Student Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
        {/* Animated Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-yellow-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 border-2 border-yellow-400/15 rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-32 left-40 w-40 h-40 border-2 border-yellow-400/10 rounded-lg animate-bounce-slow"></div>
        <div className="absolute top-60 left-1/2 w-28 h-28 border-2 border-yellow-400/25 rotate-12 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-36 h-36 border-2 border-yellow-400/20 rounded-full animate-spin-slow"></div>
        
        {/* Student/Educational Symbols */}
        <div className="absolute top-32 left-1/3 text-yellow-400/10 text-6xl font-bold animate-pulse">🎓</div>
        <div className="absolute top-1/2 right-1/3 text-yellow-400/10 text-6xl font-bold animate-pulse">🏆</div>
        <div className="absolute bottom-40 left-1/2 text-yellow-400/10 text-6xl font-bold animate-pulse">📚</div>
        <div className="absolute top-1/4 right-1/4 text-yellow-400/10 text-5xl font-bold animate-pulse">🎯</div>
        <div className="absolute bottom-1/4 left-1/4 text-yellow-400/10 text-5xl font-bold animate-pulse">⭐</div>
        <div className="absolute top-3/4 right-1/3 text-yellow-400/10 text-5xl font-bold animate-pulse">🚀</div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Glass Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-[3rem] shadow-2xl shadow-white/20">
            
            <div className="text-center mb-10">
              {/* Clean Elegant Logo */}
              <div className="relative w-28 h-28 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/40 animate-bounce-slow">
                  <FaUserGraduate className="text-white text-5xl" />
                </div>
              </div>
              
              <h1 className="text-4xl font-black bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent mb-3" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                منصة الطالب
              </h1>
              <p className="text-yellow-200/90 font-bold text-lg mb-2">انطلق نحو التفوق!</p>
              <p className="text-cyan-200/80 text-sm font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>تابع حصصك وحقق نجاحك</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50/90 backdrop-blur border-2 border-red-200/60 text-red-700 p-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-100/50 animate-shake">
                  <FaExclamationCircle className="text-red-500" />
                  <span className="text-sm font-bold">{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-black text-yellow-400 mb-3 mr-2 flex items-center gap-2">
                  <span className="text-lg">🎓</span> كود الطالب
                </label>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-2xl blur-xl"></div>
                  <input 
                    type="text" 
                    placeholder="مثال: S-100" 
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    className="relative w-full p-4 pr-12 bg-white/90 backdrop-blur border-2 border-yellow-400/50 focus:bg-white focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-200/50 rounded-2xl outline-none transition-all font-bold text-lg text-emerald-900 placeholder-emerald-400 shadow-inner"
                    required
                  />
                  <FaUserGraduate className="absolute top-4 right-4 text-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-yellow-400 mb-3 mr-2 flex items-center gap-2">
                  <span className="text-lg">🔐</span> كلمة السر
                </label>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-2xl blur-xl"></div>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="relative w-full p-4 pr-12 bg-white/90 backdrop-blur border-2 border-yellow-400/50 focus:bg-white focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-200/50 rounded-2xl outline-none transition-all font-bold text-lg text-emerald-900 placeholder-emerald-400 shadow-inner"
                    required
                  />
                  <FaLock className="absolute top-4 right-4 text-emerald-400" />
                </div>
              </div>

              <button 
                disabled={loading}
                className="relative w-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:from-yellow-500 hover:via-amber-600 hover:to-orange-600 text-emerald-900 p-4 rounded-2xl font-black text-lg shadow-2xl shadow-yellow-400/40 hover:shadow-xl hover:shadow-yellow-300/50 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:from-gray-400 disabled:to-gray-500 disabled:text-gray-600"
              >
                {loading ? (
                  <>
                    <div className="w-6 h-6 border-4 border-emerald-900/30 border-t-emerald-900 rounded-full animate-spin"></div>
                    جاري الدخول...
                  </>
                ) : (
                  <>
                    <span className="text-xl">🚀</span>
                    انطلق للمنصة
                    <FaRocket className="text-xl" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-yellow-200/60 text-xs font-bold mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                ⭐ منصة المتفوقين للطلاب الطموحين ⭐
              </p>
              <p className="text-cyan-200/50 text-[10px] font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                إذا واجهت مشكلة، تواصل مع <span className="text-yellow-400 font-bold">سكرتارية السنتر</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
