'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';
import { useAuth } from '../../../../context/AuthContext';
import SmartPlayer from '../../../../components/SmartPlayer';
import { 
  FaLock, FaCheckCircle, FaPlayCircle, FaFilePdf, 
  FaQuestionCircle, FaArrowRight, FaBars, FaTimes 
} from 'react-icons/fa';

export default function StudentCourseView() {
  const { id: courseId } = useParams();
  const router = useRouter();
  const { user, centerId } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [progress, setProgress] = useState([]);       // lesson IDs that are completed
  const [watchData, setWatchData] = useState({});      // ⏱️ { lessonId: { resumePosition, watchedSeconds } }
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const lastSaveRef = useRef({});   // tracks last save timestamp per lesson

  useEffect(() => {
    if (user && centerId) {
      fetchInitialData();
    }
  }, [user, centerId, courseId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. جلب بيانات الطالب
      const { data: std } = await supabase.from('students').select('*').eq('id', user.id).single();
      setStudentData(std);

      // 2. التحقق من الاشتراك
      const { data: enrollment } = await supabase
        .from('student_online_enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      
      setIsEnrolled(!!enrollment);

      // 3. جلب الكورس والدروس
      const { data: crs } = await supabase.from('courses').select('*, instructors(name)').eq('id', courseId).single();
      setCourse(crs);

      const { data: lssns } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      
      setLessons(lssns || []);

      // 4. جلب التقدم + بيانات المشاهدة
      const { data: prog } = await supabase
        .from('student_lesson_progress')
        .select('lesson_id, resume_position, watched_seconds')
        .eq('student_id', user.id);

      setProgress(prog?.filter(p => p.is_completed).map(p => p.lesson_id) || []);

      // ⏱️ جدول watchData: { lessonId => { resumePosition, watchedSeconds } }
      const wd = {};
      prog?.forEach(p => {
        wd[p.lesson_id] = {
          resumePosition: p.resume_position || 0,
          watchedSeconds: p.watched_seconds || 0,
        };
      });
      setWatchData(wd);

      // تحديد أول درس متاح
      if (lssns?.length > 0) {
        setSelectedLesson(lssns[0]);
        setSelectedIndex(0);
      }

    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ حفظ التقدم بشكل مختلف عن الإكمال
  const saveWatchProgress = async (lessonId, playedSeconds, watchedSeconds, totalDuration) => {
    if (!user || !lessonId) return;

    // Throttle: save at most once every 10 seconds per lesson
    const now = Date.now();
    if (lastSaveRef.current[lessonId] && now - lastSaveRef.current[lessonId] < 10000) return;
    lastSaveRef.current[lessonId] = now;

    const watchPct = totalDuration > 0 ? (watchedSeconds / totalDuration) : 0;
    const isCompleted = watchPct >= 0.85;  // ❌ متينسدش غير 85%

    await supabase.from('student_lesson_progress').upsert({
      student_id: user.id,
      lesson_id: lessonId,
      resume_position: Math.floor(playedSeconds),
      watched_seconds: Math.floor(watchedSeconds),
      total_duration: Math.floor(totalDuration),
      watch_percentage: Math.round(watchPct * 100),
      is_completed: isCompleted,
    }, { onConflict: 'student_id,lesson_id' });

    if (isCompleted && !progress.includes(lessonId)) {
      setProgress(prev => [...prev, lessonId]);
    }

    // Update local watchData cache
    setWatchData(prev => ({
      ...prev,
      [lessonId]: { resumePosition: Math.floor(playedSeconds), watchedSeconds: Math.floor(watchedSeconds) }
    }));
  };

  const watermarkText = studentData ? `${studentData.name} - ${studentData.phone || studentData.unique_id}` : 'Classora Secured';

  // ⛓️ التحقق من الوصول التسلسلي
  const isLessonAccessible = (index) => {
    if (!course?.is_sequential) return true;      // التسلسل مش مفعّل
    if (index === 0) return true;                  // الدرس الأول متاح دايماً
    const prevLesson = lessons[index - 1];
    return prevLesson ? progress.includes(prevLesson.id) : false;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="h-64 bg-slate-200 rounded-[2.5rem] animate-pulse"></div>
        <div className="grid grid-cols-4 gap-4">
           <div className="col-span-3 h-12 bg-slate-200 rounded-xl animate-pulse"></div>
           <div className="h-12 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  if (!course) return <div className="p-20 text-center font-bold text-slate-400">الكورس غير موجود</div>;

  const canWatchCurrent = (isEnrolled || selectedLesson?.is_free) && isLessonAccessible(selectedIndex);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden" dir="rtl">
      
      {/* Sidebar - الدروس */}
      <aside className={`bg-white border-l border-slate-100 flex flex-col transition-all duration-300 z-30
        ${sidebarOpen ? 'w-full md:w-80' : 'w-0 md:w-0 overflow-hidden'}
        ${sidebarOpen ? 'fixed md:sticky' : 'hidden md:flex'} inset-y-0 right-0`}
      >
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-black text-slate-800 truncate">{course.name}</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400"><FaTimes /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {course?.is_sequential && (
             <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-black px-3 py-2 rounded-xl mb-1">
               <span>⛓️</span> هذا الكورس يُلزم بالتسلسل
             </div>
           )}
           {lessons.map((lesson, index) => {
             const isSubLocked = !isEnrolled && !lesson.is_free;
             const isSeqLocked = !isSubLocked && !isLessonAccessible(index);
             const isLocked = isSubLocked || isSeqLocked;
             const isActive = selectedLesson?.id === lesson.id;
             const isDone = progress.includes(lesson.id);

             return (
               <button
                 key={lesson.id}
                 disabled={isSubLocked}
                 onClick={() => {
                    setSelectedLesson(lesson);
                    setSelectedIndex(index);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                 }}
                 className={`w-full p-4 rounded-2xl border-2 transition-all flex items-start gap-4 text-right
                   ${isActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-50 hover:border-slate-100 bg-white'}
                   ${isSubLocked ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}
                 `}
               >
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm
                   ${isDone ? 'bg-green-100 text-green-600' 
                   : isSeqLocked ? 'bg-indigo-100 text-indigo-400'
                   : isSubLocked ? 'bg-red-100 text-red-400'
                   : isActive ? 'bg-blue-600 text-white' 
                   : 'bg-slate-100 text-slate-400'}
                 `}>
                   {isDone ? <FaCheckCircle /> 
                   : isSeqLocked ? <span className="text-[10px]">⛓️</span>
                   : isSubLocked ? <FaLock size={12} /> 
                   : index + 1}
                 </div>
                 
                 <div className="flex-1 overflow-hidden">
                    <p className={`font-black text-sm truncate ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{lesson.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-bold text-slate-400">حصة رقم {index + 1}</span>
                       {lesson.is_free && <span className="text-[9px] font-black uppercase tracking-tighter bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">مجانية</span>}
                       {isSeqLocked && <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">أكمل السابقة أولاً</span>}
                    </div>
                 </div>
               </button>
             );
           })}
        </div>
      </aside>

      {/* Main Content - المشغل */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50">
         {/* Top Bar Responsive */}
         <div className="p-4 flex items-center justify-between md:hidden">
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-600">
               <FaBars />
            </button>
            <h1 className="font-black text-slate-800 text-sm">{course.name}</h1>
            <button onClick={() => router.back()} className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-600">
               <FaArrowRight />
            </button>
         </div>

         <div className="p-4 md:p-8 flex-1">
            <div className="max-w-5xl mx-auto space-y-6">
               
               {/* Player Section */}
               {!selectedLesson ? (
                  <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-sm">
                     <FaPlayCircle size={64} className="mx-auto text-slate-200 mb-6" />
                     <h3 className="text-xl font-black text-slate-400">اختر درساً للبدء في المشاهدة</h3>
                  </div>
               ) : (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                    
                    {/* The Player Hook */}
                    <div className="relative">
                       {canWatchCurrent ? (
                          <SmartPlayer 
                            url={selectedLesson.video_url} 
                            studentInfo={watermarkText}
                            resumePosition={watchData[selectedLesson.id]?.resumePosition || 0}
                            onProgress={(p) => {
                              if (p.totalDuration > 0) {
                                saveWatchProgress(
                                  selectedLesson.id,
                                  p.playedSeconds,
                                  p.watchedSeconds,
                                  p.totalDuration
                                );
                              }
                            }}
                          />
                        ) : !isLessonAccessible(selectedIndex) ? (
                          <div className="aspect-video bg-gradient-to-br from-indigo-950 to-slate-900 rounded-[2rem] flex flex-col items-center justify-center text-white p-10 text-center border-4 border-indigo-900/50">
                             <div className="text-5xl mb-5">⛓️</div>
                             <h2 className="text-2xl font-black mb-3">هذا الدرس مقفول</h2>
                             <p className="text-indigo-300 max-w-sm mx-auto mb-2 font-bold">يجب عليك إتمام مشاهدة الدرس السابق أولاً</p>
                             <p className="text-slate-500 text-sm font-bold bg-white/5 px-4 py-2 rounded-xl mt-1">«{lessons[selectedIndex - 1]?.title}»</p>
                             <button
                               onClick={() => { setSelectedLesson(lessons[selectedIndex - 1]); setSelectedIndex(selectedIndex - 1); }}
                               className="mt-8 bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-2xl font-black shadow-xl shadow-indigo-500/20 transition"
                             >
                               ▶ انتقل للدرس السابق
                             </button>
                          </div>
                        ) : (
                          <div className="aspect-video bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center text-white p-10 text-center border-4 border-slate-200">
                             <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
                                <FaLock size={40} className="text-amber-400" />
                             </div>
                             <h2 className="text-2xl font-black mb-4">هذه الحصة مغلقة 🔒</h2>
                             <p className="text-slate-400 max-w-md mx-auto mb-8">يجب عليك تفعيل الكورس أولاً لمشاهدة هذا المحتوى.</p>
                             <button 
                               onClick={() => router.push(`/student/checkout/${courseId}`)}
                               className="bg-blue-600 px-8 py-3 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition"
                             >
                               تفعيل الكورس الآن
                             </button>
                          </div>
                        )}
                    </div>

                    {/* Lesson Details */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-6 mb-6">
                          <div>
                             <h1 className="text-2xl font-black text-slate-800">{selectedLesson.title}</h1>
                             <p className="text-slate-400 text-sm mt-1 font-bold">بواسطة: {course.instructors?.name || course.instructor}</p>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                             {selectedLesson.pdf_url && (
                               <a 
                                 href={selectedLesson.pdf_url} 
                                 target="_blank" 
                                 className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-600 px-5 py-3 rounded-2xl font-black text-sm hover:bg-slate-100 transition"
                               >
                                 <FaFilePdf className="text-red-500" /> المذكرة
                               </a>
                             )}
                             <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-600 px-5 py-3 rounded-2xl font-black text-sm">
                                <FaQuestionCircle className="text-blue-500" /> اسأل سؤال
                             </button>
                          </div>
                       </div>

                       <div className="text-slate-600 leading-relaxed font-bold">
                          <p className="whitespace-pre-wrap">{selectedLesson.description || 'لا يوجد وصف متاح لهذه الحصة.'}</p>
                       </div>
                    </div>

                 </div>
               )}
            </div>
         </div>
      </main>

    </div>
  );
}
