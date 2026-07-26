'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { 
  FaClock, FaCheckCircle, FaChevronLeft, FaChevronRight, 
  FaSpinner, FaArrowRight, FaTrophy, FaExclamationTriangle, FaSave, FaPowerOff
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function StudentExamPage() {
  const { id: examId } = useParams();
  const router = useRouter();
  const { user, centerId } = useAuth();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: answer_text }
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [results, setResults] = useState(null);

  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      // 1. Fetch Exam Details
      const { data: examData, error: eError } = await supabaseBrowser
        .from('exams')
        .select('*, courses(name)')
        .eq('id', examId)
        .single();
      if (eError) throw eError;
      setExam(examData);

      // 2. Fetch existing submissions (any status)
      const { data: existingSubs, error: subError } = await supabaseBrowser
        .from('student_exam_submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .order('attempt_number', { ascending: false });
      
      if (subError) throw subError;

      const latestSub = existingSubs?.[0];
      
      if (latestSub && latestSub.status === 'completed') {
        setResults(latestSub);
        setIsFinished(true);
        setLoading(false);
        return;
      }

      // 3. Fetch Questions
      const { data: questionsData, error: qError } = await supabaseBrowser
        .from('exam_questions')
        .select('*, question_bank(*)')
        .eq('exam_id', examId)
        .order('sort_order', { ascending: true });
      if (qError) throw qError;
      
      if (!questionsData || questionsData.length === 0) {
        throw new Error('لا توجد أسئلة مضافة لهذا الامتحان بعد');
      }

      let finalQuestions = questionsData.map(q => q.question_bank);
      if (examData.shuffle_questions) {
          finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5);
      }
      setQuestions(finalQuestions);

      // 4. Create or Resume Submission
      let sub;
      if (latestSub && latestSub.status === 'ongoing') {
        sub = latestSub;
      } else {
        // Create new attempt
        const nextAttempt = (latestSub?.attempt_number || 0) + 1;
        
        // Check if exceeds max attempts
        if (examData.max_attempts && nextAttempt > examData.max_attempts) {
           throw new Error('لقد استنفدت جميع المحاولات المتاحة لهذا الامتحان');
        }

        const { data: newSub, error: createError } = await supabaseBrowser
          .from('student_exam_submissions')
          .insert({
             exam_id: examId,
             student_id: user.id,
             center_id: centerId,
             status: 'ongoing',
             attempt_number: nextAttempt,
             started_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) throw createError;
        sub = newSub;
      }
      
      setSubmissionId(sub.id);

      // 5. Timer Logic
      if (examData.duration_minutes) {
         const startTime = new Date(sub.started_at);
         const endTime = new Date(startTime.getTime() + examData.duration_minutes * 60000);
         const remaining = Math.max(0, Math.floor((endTime - new Date()) / 1000));
         setTimeLeft(remaining);
      }

    } catch (err) {
      console.error("Exam Fetch Error:", err);
      toast.error(err.message || 'فشل تحميل الامتحان');
      // If error is related to no questions, maybe go back
      if (err.message.includes('أسئلة')) {
        setTimeout(() => router.back(), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [user, examId, centerId, router]);

  useEffect(() => {
    if (user && examId) fetchData();
  }, [fetchData]);

  // Timer Countdown
  useEffect(() => {
    if (timeLeft === null || isFinished) return;
    
    if (timeLeft <= 0) {
      handleSubmit(true); // Auto-submit on timeout
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, isFinished]);

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async (isTimeout = false) => {
    if (isSubmitting || isFinished) return;
    if (!isTimeout && !confirm('⚠️ هل أنت متأكد من إنهاء الامتحان وتسليم الإجابات؟')) return;

    setIsSubmitting(true);
    try {
      // Calculate Score
      let totalScore = 0;
      const answerPayload = questions.map(q => {
        const studentAnswer = answers[q.id] || '';
        const isCorrect = studentAnswer === q.correct_answer;
        const points = isCorrect ? q.points : 0;
        totalScore += points;
        return {
          submission_id: submissionId,
          question_id: q.id,
          student_id: user.id,
          answer_text: studentAnswer,
          is_correct: isCorrect,
          points_earned: points
        };
      });

      // 1. Insert Answers
      await supabaseBrowser.from('student_exam_answers').insert(answerPayload);

      // 2. Update Submission
      const isPassed = (totalScore / (exam.max_score || 1)) * 100 >= (exam.pass_percentage || 50);
      
      const { data: finalSub, error } = await supabaseBrowser
        .from('student_exam_submissions')
        .update({
          finished_at: new Date().toISOString(),
          score: totalScore,
          is_passed: isPassed,
          status: isTimeout ? 'timed_out' : 'completed'
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (error) throw error;

      // 3. Optional: Sync with general exam_results for the grading system
      await supabaseBrowser.from('exam_results').upsert({
          exam_id: examId,
          student_id: user.id,
          score: totalScore,
          status: 'present',
          teacher_comment: isTimeout ? 'سلم تلقائياً لانتهاء الوقت' : 'تم الحل أونلاين'
      }, { onConflict: 'exam_id, student_id' });

      setResults(finalSub);
      setIsFinished(true);
      if (isTimeout) toast.error('انتهى الوقت! تم حفظ إجاباتك تلقائياً');
      else toast.success('تم تسليم الامتحان بنجاح');

    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
     <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
           <FaSpinner className="animate-spin text-blue-500 text-4xl mx-auto" />
           <p className="font-black text-slate-400 text-sm tracking-widest uppercase">Initializing Digital Exam Environment...</p>
        </div>
     </div>
  );

  if (isFinished) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6" dir="rtl">
       <motion.div 
         initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
         className="w-full max-w-2xl bg-white/[0.03] border border-white/10 rounded-[4rem] p-12 text-center relative overflow-hidden"
       >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 space-y-8">
             <div className={`w-24 h-24 mx-auto rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl ${results?.is_passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {results?.is_passed ? <FaTrophy /> : <FaExclamationTriangle />}
             </div>
             
             <div>
                <h1 className="text-4xl font-black text-white mb-2">تم إنهاء الامتحان 🏁</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{exam.title}</p>
             </div>

             <div className="grid grid-cols-2 gap-4 bg-white/5 p-8 rounded-3xl border border-white/5">
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">النتيجة النهائية</p>
                   <p className="text-3xl font-black text-white">{results?.score} <span className="text-sm text-slate-500">/ {exam.max_score}</span></p>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase mb-1">الحالة</p>
                   <p className={`text-xl font-black ${results?.is_passed ? 'text-emerald-400' : 'text-red-400'}`}>
                      {results?.is_passed ? 'ناجح ✔️' : 'لم يجتز ❌'}
                   </p>
                </div>
             </div>

             <button 
               onClick={() => router.back()}
               className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3"
             >
                <FaArrowRight className="rotate-180" /> العودة للدروس
             </button>
          </div>
       </motion.div>
    </div>
  );

  const currentQ = questions[currentQuestionIdx];
  const progressPercent = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#020617] font-cairo text-slate-200" dir="rtl">
       <Toaster position="top-center" />

       {/* Header */}
       <header className="h-24 bg-[#0d152a]/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 border border-white/5">
                <FaClock className={timeLeft < 60 ? 'animate-pulse text-red-500' : ''} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الوقت المتبقي</p>
                <p className={`text-xl font-black tabular-nums ${timeLeft < 60 ? 'text-red-500' : 'text-white'}`}>
                   {timeLeft ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                </p>
             </div>
          </div>

          <div className="hidden md:block text-center flex-1 mx-20">
             <h2 className="font-black text-white truncate max-w-md mx-auto">{exam.title}</h2>
             <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                />
             </div>
          </div>

          <button 
            onClick={() => handleSubmit(false)}
            className="px-8 h-14 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-xs hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 active:scale-95"
          >
             إنهاء الامتحان <FaPowerOff />
          </button>
       </header>

       <main className="max-w-4xl mx-auto py-12 px-6">
          <AnimatePresence mode="wait">
             <motion.div 
               key={currentQuestionIdx}
               initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
               className="space-y-10"
             >
                {/* Question Info */}
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-xl">
                         {currentQuestionIdx + 1}
                      </span>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Question of {questions.length}</span>
                   </div>
                   <h1 className="text-2xl md:text-3xl font-black leading-relaxed text-white">
                      {currentQ.question_text}
                   </h1>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-4">
                   {currentQ.options?.map((opt, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleAnswerSelect(currentQ.id, opt)}
                        className={`p-6 rounded-3xl border-2 text-right transition-all flex items-center justify-between group
                           ${answers[currentQ.id] === opt 
                              ? 'bg-blue-600 border-blue-500 shadow-2xl shadow-blue-900/30 text-white' 
                              : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-slate-400 hover:text-white'}
                        `}
                      >
                         <span className="font-black text-lg flex items-center gap-6">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${answers[currentQ.id] === opt ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                               {String.fromCharCode(65 + idx)}
                            </span>
                            {opt}
                         </span>
                         {answers[currentQ.id] === opt && <FaCheckCircle className="animate-in zoom-in" />}
                      </button>
                   ))}
                </div>
             </motion.div>
          </AnimatePresence>
       </main>

       {/* Footer Navigation */}
       <footer className="fixed bottom-0 inset-x-0 h-24 bg-[#0d152a]/80 backdrop-blur-xl border-t border-white/5 px-6 md:px-12 flex items-center justify-between z-50">
          <button 
             disabled={currentQuestionIdx === 0}
             onClick={() => setCurrentQuestionIdx(p => p - 1)}
             className="h-14 px-8 bg-white/5 rounded-2xl font-black text-xs text-slate-400 hover:text-white disabled:opacity-20 transition-all flex items-center gap-3"
          >
             <FaChevronRight /> السابق
          </button>

          <div className="flex items-center gap-2">
             {questions.map((_, i) => (
               <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentQuestionIdx ? 'bg-blue-600 w-6' : answers[questions[i].id] ? 'bg-emerald-500' : 'bg-white/10'}`}></div>
             ))}
          </div>

          {currentQuestionIdx === questions.length - 1 ? (
             <button 
               onClick={() => handleSubmit(false)}
               className="h-14 px-10 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-900/20 hover:bg-emerald-500 transition-all flex items-center gap-3 active:scale-95"
             >
                حفظ وإرسال النتائج <FaSave />
             </button>
          ) : (
            <button 
              onClick={() => setCurrentQuestionIdx(p => p + 1)}
              className="h-14 px-8 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all flex items-center gap-3"
            >
               التالي <FaChevronLeft />
            </button>
          )}
       </footer>

       <style jsx>{`
         .custom-scrollbar::-webkit-scrollbar { width: 5px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
       `}</style>
    </div>
  );
}
