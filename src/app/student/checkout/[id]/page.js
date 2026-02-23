'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';
import { useAuth } from '../../../../context/AuthContext';
import { FaTicketAlt, FaLock, FaCheckCircle, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';

export default function CourseActivationPage() {
  const { id: courseId } = useParams();
  const router = useRouter();
  const { user, centerId } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (courseId) {
      supabase.from('courses').select('name').eq('id', courseId).single().then(({ data }) => setCourse(data));
    }
  }, [courseId]);

  const handleActivate = async () => {
    if (!code) return;
    setLoading(true);
    setStatus('loading');

    try {
      // 1. التحقق من الكود
      const { data: voucher, error: vError } = await supabase
        .from('recharge_codes')
        .select('*')
        .eq('code', code.trim())
        .eq('course_id', courseId)
        .maybeSingle();
      
      if (vError || !voucher) {
        throw new Error('الكود غير صحيح أو غير مخصص لهذا الكورس');
      }

      if (voucher.is_used) {
        throw new Error('هذا الكود تم استخدامه مسبقاً');
      }

      // 2. التحقق من وجود الطالب في جدول الطلاب للتأكد من الـ Foreign Key
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id, unique_id')
        .eq('id', user.id)
        .single();

      console.log('🔍 Activating for student:', { authId: user.id, dbId: studentRecord?.id, dbUniqueId: studentRecord?.unique_id });

      if (studentError || !studentRecord) {
        console.error('❌ Student record not found in DB:', studentError);
        throw new Error('لم يتم العثور على بياناتك كطالب في الداتابيز، يرجى مراجعة الإدارة.');
      }

      // 3. تفعيل الكورس للطالب
      const { error: activateError } = await supabase
        .from('student_online_enrollments')
        .insert([{
          student_id: studentRecord.id, // استخدام الـ ID المؤكد من الجدول
          course_id: courseId,
          center_id: centerId,
          payment_method: 'voucher'
        }]);

      if (activateError) {
        console.error('❌ Enrollment Error:', activateError);
        if (activateError.code === '23505') throw new Error('أنت مشترك بالفعل في هذا الكورس');
        throw activateError;
      }

      // 3. تحديث الكود كـ "مستخدم"
      await supabase
        .from('recharge_codes')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString(),
          used_by: user.id 
        })
        .eq('id', voucher.id);

      setStatus('success');
      setTimeout(() => {
        router.push(`/student/courses/${courseId}`);
      }, 2000);

    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
      
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden text-center p-10 animate-in fade-in zoom-in duration-500">
         
         <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            {status === 'success' ? <FaCheckCircle size={48} className="text-green-500 animate-bounce" /> : <FaTicketAlt size={48} />}
         </div>

         <h1 className="text-2xl font-black text-slate-800 mb-2">تفعيل كورس الرقمي</h1>
         <p className="text-slate-500 font-bold mb-8">أنت على وشك تفعيل: <span className="text-blue-600">"{course?.name}"</span></p>

         {status === 'success' ? (
           <div className="bg-green-50 text-green-700 p-6 rounded-2xl font-black">
              تم التفعيل بنجاح! جاري تحويلك للمحتوى...
           </div>
         ) : (
           <div className="space-y-6">
              <div>
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">أدخل كود الشحن</label>
                 <input 
                   type="text"
                   value={code}
                   onChange={(e) => setCode(e.target.value)}
                   placeholder="CLS-XXXX-XXXX"
                   className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 text-center font-black text-xl tracking-widest outline-none focus:border-blue-500 transition-all uppercase"
                 />
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 justify-center text-red-500 font-bold text-sm bg-red-50 p-3 rounded-xl">
                   <FaExclamationTriangle shrink={0} /> {errorMsg}
                </div>
              )}

              <button 
                onClick={handleActivate}
                disabled={loading || !code}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'تفعيل الآن'}
              </button>

              <button 
                onClick={() => router.back()}
                className="text-slate-400 font-bold text-sm flex items-center justify-center gap-2 w-full mt-4"
              >
                <FaArrowRight size={12} /> العودة للكورس
              </button>
           </div>
         )}

      </div>

    </div>
  );
}
