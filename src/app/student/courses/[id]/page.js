'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase-browser';
import { useAuth } from '../../../../context/AuthContext';
import SmartPlayer from '../../../../components/SmartPlayer';
import { 
  FaLock, FaCheckCircle, FaPlayCircle, FaFilePdf, 
  FaQuestionCircle, FaArrowRight, FaBars, FaTimes, 
  FaChevronDown, FaChevronUp, FaLockOpen, FaClock, FaRocket, FaTrophy, FaChevronLeft
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function StudentCourseView() {
  const { id: courseId } = useParams();
  const router = useRouter();
  const { user, centerId } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [progress, setProgress] = useState([]);       
  const [unlockedChapters, setUnlockedChapters] = useState([]);
  const [unlockedLessons, setUnlockedLessons] = useState([]);
  const [watchData, setWatchData] = useState({});      
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [courseExams, setCourseExams] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const lastSaveRef = useRef({});
  const currentTimeRef = useRef(0);

  useEffect(() => {
    if (user && centerId) {
      fetchInitialData();
    }
  }, [user, centerId, courseId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: std } = await supabase.from('students').select('*').eq('id', user.id).single();
      setStudentData(std);

      const { data: enrollment } = await supabase
        .from('student_online_enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      
      setIsEnrolled(!!enrollment);

      const { data: crs } = await supabase.from('courses').select('*, instructors(name)').eq('id', courseId).single();
      setCourse(crs);

      // Fetch Chapters & Lessons
      const [chaptersRes, lessonsRes] = await Promise.all([
        supabase.from('lesson_chapters').select('*').eq('course_id', courseId).order('order_index'),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index')
      ]);

      // Filter and Apply fallback pricing
      const allLessons = (lessonsRes.data || []).filter(l => {
        if (!l.scheduled_at) return true;
        return new Date(l.scheduled_at) <= now;
      }).map(l => ({
        ...l,
        price: l.price > 0 ? l.price : (crs?.digital_price || 0)
      }));

      setChapters(chaptersRes.data || []);
      setLessons(allLessons);

      const { data: examsRes } = await supabase
        .from('exams')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_electronic', true);
      setCourseExams(examsRes || []);
      console.log("Fetched Exams for course:", courseId, examsRes);

      const { data: prog } = await supabase
        .from('student_lesson_progress')
        .select('lesson_id, resume_position, watched_seconds, is_completed')
        .eq('student_id', user.id);

      setProgress(prog?.filter(p => p.is_completed).map(p => p.lesson_id) || []);

      const wd = {};
      prog?.forEach(p => {
        wd[p.lesson_id] = {
          resumePosition: p.resume_position || 0,
          watchedSeconds: p.watched_seconds || 0,
        };
      });
      setWatchData(wd);

      // Fetch Individual Lesson & Chapter Unlocks
      const [lessonUnlocks, chapterUnlocks] = await Promise.all([
        supabase.from('student_lesson_access').select('lesson_id').eq('student_id', user.id).eq('course_id', courseId),
        supabase.from('student_chapter_access').select('chapter_id').eq('student_id', user.id).eq('course_id', courseId)
      ]);
      
      setUnlockedLessons(lessonUnlocks.data?.map(u => u.lesson_id) || []);
      setUnlockedChapters(chapterUnlocks.data?.map(u => u.chapter_id) || []);

      if (allLessons.length > 0) {
        setSelectedLesson(allLessons[0]);
        setSelectedIndex(0);
        // Expand the chapter of the first lesson
        if (allLessons[0].chapter_id) {
          setExpandedChapters({ [allLessons[0].chapter_id]: true });
        }
      }

    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussions = async (lessonId) => {
    if (!lessonId) return;
    const { data } = await supabase
      .from('lesson_discussions')
      .select('*, students(name), staff_profiles(full_name)')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });
    setDiscussions(data || []);
  };

  const sendDiscussion = async () => {
    if (!newComment.trim() || !selectedLesson || !user) return;
    setSendingComment(true);
    try {
      const { error } = await supabase.from('lesson_discussions').insert([{
        lesson_id: selectedLesson.id,
        student_id: user.id,
        message: newComment,
        video_timestamp: currentTimeRef.current,
        center_id: centerId
      }]);
      
      if (!error) {
        setNewComment('');
        fetchDiscussions(selectedLesson.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingComment(false);
    }
  };

  const saveWatchProgress = async (lessonId, playedSeconds, watchedSeconds, totalDuration) => {
    if (!user || !lessonId) return;
    const nowTime = Date.now();
    if (lastSaveRef.current[lessonId] && nowTime - lastSaveRef.current[lessonId] < 10000) return;
    lastSaveRef.current[lessonId] = nowTime;

    const watchPct = totalDuration > 0 ? (watchedSeconds / totalDuration) : 0;
    const isCompleted = watchPct >= 0.85;

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

    setWatchData(prev => ({
      ...prev,
      [lessonId]: { resumePosition: Math.floor(playedSeconds), watchedSeconds: Math.floor(watchedSeconds) }
    }));
    currentTimeRef.current = playedSeconds;
  };

  const isLessonAccessible = (lesson, idx) => {
    if (!course?.is_sequential) return true;
    if (idx === 0) return true;
    const prevLesson = lessons[idx - 1];
    return prevLesson ? progress.includes(prevLesson.id) : false;
  };

  const toggleChapter = (id) => {
    setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const watermarkText = studentData ? `${studentData.name} - ${studentData.phone || studentData.unique_id}` : 'Nexus Academy Secured';

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-6">
       <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
       <p className="text-slate-500 font-black tracking-widest uppercase text-[10px] animate-pulse">Syncing Learning Experience...</p>
    </div>
  );

  if (!course) return <div className="p-20 text-center font-bold text-slate-400">الكورس غير موجود</div>;

  const canWatchCurrent = (
    isEnrolled || 
    selectedLesson?.is_free || 
    unlockedLessons.includes(selectedLesson?.id) ||
    unlockedChapters.includes(selectedLesson?.chapter_id)
  ) && isLessonAccessible(selectedLesson, selectedIndex);

  return <div className="min-h-screen bg-[#020617] flex flex-col md:flex-row h-screen overflow-hidden selection:bg-blue-500/30 font-cairo" dir="rtl">
      
      {/* 🏔️ Sidebar: Curriculum Engine */}
      <aside className={`bg-[#0d152a] border-l border-white/5 flex flex-col transition-all duration-500 z-50 overflow-hidden
        ${sidebarOpen ? 'w-full md:w-[26rem]' : 'w-0 md:w-0'}
        ${sidebarOpen ? 'fixed md:sticky' : 'hidden md:flex'} inset-y-0 right-0`}
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
           <div>
              <h2 className="font-black text-white text-lg tracking-tight mb-1">{course.name}</h2>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Curriculum</p>
              </div>
           </div>
           <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"><FaTimes /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
           
           {/* General Lessons (No Chapter) */}
           {lessons.filter(l => !l.chapter_id).map((lesson, idx) => (
             <LessonItem 
               key={lesson.id} 
               lesson={lesson} 
               idx={idx} 
               isActive={selectedLesson?.id === lesson.id}
               isDone={progress.includes(lesson.id)}
               isLocked={(!isEnrolled && !lesson.is_free && !unlockedLessons.includes(lesson.id) && !unlockedChapters.includes(lesson.chapter_id)) || !isLessonAccessible(lesson, idx)}
               onClick={() => { setSelectedLesson(lesson); setSelectedIndex(idx); if (window.innerWidth < 768) setSidebarOpen(false); }}
             />
           ))}

           {/* Chapter Based Lessons */}
           {chapters.map((chapter, cIdx) => {
             const chapterLessons = lessons.filter(l => l.chapter_id === chapter.id);
             if (chapterLessons.length === 0) return null;
             const isExpanded = !!expandedChapters[chapter.id];

             return (
               <div key={chapter.id} className="space-y-2">
                  <button 
                    onClick={() => toggleChapter(chapter.id)}
                    className="w-full p-5 bg-white/[0.03] hover:bg-white/[0.05] rounded-[1.5rem] flex items-center justify-between transition-all group"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center font-black text-xs border border-blue-500/10">{cIdx + 1}</div>
                        <div className="text-right">
                           <h4 className="font-black text-slate-200 text-sm group-hover:text-white transition-colors">{chapter.title}</h4>
                           <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{chapterLessons.length} Sections Available</p>
                        </div>
                     </div>
                     {isExpanded ? <FaChevronUp className="text-slate-600" size={12} /> : <FaChevronDown className="text-slate-600" size={12} />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 pr-4 border-r border-white/5 mr-5"
                      >
                         {chapterLessons.map((lesson) => {
                           const globalIdx = lessons.findIndex(l => l.id === lesson.id);
                           const lessonExams = courseExams.filter(e => e.lesson_id === lesson.id);
                           return (
                            <div key={lesson.id} className="space-y-1">
                              <LessonItem 
                                lesson={lesson} 
                                idx={globalIdx} 
                                isActive={selectedLesson?.id === lesson.id}
                                isDone={progress.includes(lesson.id)}
                                isLocked={(!isEnrolled && !lesson.is_free && !unlockedLessons.includes(lesson.id) && !unlockedChapters.includes(lesson.chapter_id)) || !isLessonAccessible(lesson, globalIdx)}
                                onClick={() => { setSelectedLesson(lesson); setSelectedIndex(globalIdx); if (window.innerWidth < 768) setSidebarOpen(false); }}
                              />
                              {lessonExams.map(exam => (
                                <Link 
                                  key={exam.id}
                                  href={`/student/exams/${exam.id}`}
                                  className="mx-2 p-3 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-500/20 rounded-xl flex items-center justify-between group transition-all"
                                >
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-pink-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/20">
                                         <FaTrophy size={12} />
                                      </div>
                                      <span className="text-[11px] font-black text-pink-400">تقييم: {exam.title}</span>
                                   </div>
                                   <FaChevronLeft className="text-pink-500/50" size={8} />
                                </Link>
                              ))}
                            </div>
                           );
                         })}

                         {/* Chapter Final Exams */}
                         {courseExams.filter(e => e.chapter_id === chapter.id).map(exam => (
                            <Link 
                               key={exam.id}
                               href={`/student/exams/${exam.id}`}
                               className="mt-2 p-5 bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 rounded-[1.5rem] flex items-center justify-between group transition-all shadow-xl shadow-indigo-500/10"
                            >
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white/10 backdrop-blur-md text-white rounded-xl flex items-center justify-center border border-white/10 group-hover:rotate-12 transition-transform">
                                     <FaTrophy size={16} />
                                  </div>
                                  <div className="text-right">
                                     <h4 className="font-black text-white text-xs">امتحان الباب: {chapter.title}</h4>
                                     <p className="text-[8px] font-black text-indigo-200 uppercase tracking-[0.2em] mt-1">{exam.title}</p>
                                  </div>
                                </div>
                                <FaChevronLeft className="text-white/50" size={10} />
                            </Link>
                         ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
              );
           })}

            {/* 🏆 Quick Assessments (General Exams Only) */}
            {courseExams.filter(e => !e.lesson_id && !e.chapter_id).length > 0 && (
              <div className="pt-6 border-t border-white/5 space-y-3">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2 mb-4 italic">التقييمات العامة</p>
                 {courseExams.filter(e => !e.lesson_id && !e.chapter_id).map(exam => (
                   <Link 
                     key={exam.id}
                     href={`/student/exams/${exam.id}`}
                     className="w-full p-6 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 hover:from-blue-600/20 hover:to-indigo-600/10 border border-blue-500/20 rounded-[2rem] flex items-center justify-between group transition-all shadow-xl shadow-blue-500/5 active:scale-95"
                   >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20 group-hover:rotate-12 transition-transform">
                            <FaTrophy size={14} />
                         </div>
                         <div className="text-right">
                            <h4 className="font-black text-slate-200 text-xs">{exam.title}</h4>
                            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">امتحان شامل للمادة</p>
                         </div>
                      </div>
                      <FaChevronLeft className="text-blue-500" size={10} />
                   </Link>
                 ))}
              </div>
            )}
        </div>
      </aside>

      {/* 📺 Main Theater: Video Production */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-black relative">
         
         {/* Top Glass Bar */}
         <div className="p-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
            <div className="flex items-center gap-6">
               {!sidebarOpen && (
                 <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setSidebarOpen(true)} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                    <FaBars />
                 </motion.button>
               )}
               <div>
                  <h1 className="font-black text-white text-base md:text-xl hidden md:block">{selectedLesson?.title || course.name}</h1>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                     <FaRocket className="animate-bounce" /> Streaming Experience
                  </p>
               </div>
            </div>
            <button onClick={() => router.back()} className="h-12 px-6 bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm hover:bg-white/10 transition-all">
               العودة للمنصة <FaArrowRight size={12} />
            </button>
         </div>

         <div className="p-4 md:p-10 flex-1 max-w-6xl mx-auto w-full">
            <div className="space-y-10">
               
               {/* 📽️ Cinematic Player Layer */}
               <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                  <div className="relative bg-[#0d152a] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-3xl">
                     {selectedLesson ? (
                        canWatchCurrent ? (
                           <SmartPlayer 
                             url={selectedLesson.video_url} 
                             studentInfo={watermarkText}
                             resumePosition={watchData[selectedLesson.id]?.resumePosition || 0}
                             checkpoints={selectedLesson.checkpoints}
                             onProgress={(p) => saveWatchProgress(selectedLesson.id, p.playedSeconds, p.watchedSeconds, p.totalDuration)}
                           />
                        ) : !isLessonAccessible(selectedLesson, selectedIndex) ? (
                           <AccessGate type="sequential" lesson={lessons[selectedIndex - 1]} onGoPrev={() => { setSelectedLesson(lessons[selectedIndex - 1]); setSelectedIndex(selectedIndex - 1); }} />
                        ) : (
                           <AccessGate 
                              type="enrol" 
                              lesson={selectedLesson}
                              course={course}
                              chapter={chapters.find(c => c.id === selectedLesson.chapter_id)}
                              onEnrol={(type, targetId) => router.push(`/student/checkout/${courseId}?type=${type}&target=${targetId}`)} 
                           />
                        )
                     ) : (
                        <div className="aspect-video flex flex-col items-center justify-center text-slate-600 p-20 text-center">
                           <FaPlayCircle size={80} className="mb-8 opacity-20" />
                           <h2 className="text-2xl font-black italic">جاهز لرحلة العلم؟</h2>
                           <p className="text-xs font-black uppercase tracking-[0.4em] mt-4">Select a chapter module to begin initialization</p>
                        </div>
                     )}
                  </div>
               </div>

               {/* 📄 Documentation & Social Section */}
               {selectedLesson && (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.02] backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/5 shadow-2xl">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-white/5 pb-10 mb-10">
                       <div className="space-y-3">
                          <h1 className="text-3xl font-black text-white">{selectedLesson.title}</h1>
                          <div className="flex items-center gap-6">
                             <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                <div className="w-8 h-8 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400 font-black">👨‍🏫</div>
                                {course.instructors?.name || 'Classora Elite Faculty'}
                             </div>
                             {selectedLesson.scheduled_at && (
                                <div className="flex items-center gap-2 text-amber-500 text-xs font-bold bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/20">
                                   <FaClock size={10} /> تم النشر في: {new Date(selectedLesson.scheduled_at).toLocaleDateString('ar-EG')}
                                </div>
                             )}
                          </div>
                       </div>
                       
                       <div className="flex gap-4 w-full lg:w-auto">
                          {selectedLesson.pdf_url && (
                            <a href={selectedLesson.pdf_url} target="_blank" className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-red-600/10 text-red-500 px-8 py-4 rounded-[1.5rem] font-black text-sm border border-red-500/20 hover:bg-red-600 hover:text-white transition-all shadow-xl shadow-red-900/10">
                               <FaFilePdf size={18} /> تحميل المذكرة
                            </a>
                          )}
                          <button 
                            onClick={() => { setIsDiscussionOpen(true); fetchDiscussions(selectedLesson.id); }}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-white/5 text-slate-300 px-8 py-4 rounded-[1.5rem] font-black text-sm border border-white/10 hover:bg-blue-600 hover:text-white transition-all"
                          >
                             <FaQuestionCircle size={18} /> اسأل المعلم
                          </button>
                       </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                       <p className="text-slate-400 leading-relaxed font-bold text-lg whitespace-pre-wrap">{selectedLesson.description || 'استمتع بمشاهدة الدروس وتدوين ملاحظاتك بدقة للتفوق في منهجك الدراسي.'}</p>
                    </div>
                 </motion.div>
               )}
            </div>
         </div>
      </main>

      {/* 💬 Discussion Drawer: Internal Communication */}
      <AnimatePresence>
        {isDiscussionOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDiscussionOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="fixed inset-y-0 left-0 w-full md:w-[32rem] bg-[#0d152a] z-[70] shadow-2xl border-r border-white/5 flex flex-col"
            >
               <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div>
                    <h3 className="font-black text-white text-xl">منطقة النقاشات</h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Direct Line to Your Instructor</p>
                  </div>
                  <button onClick={() => setIsDiscussionOpen(false)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all"><FaTimes /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  {discussions.length === 0 ? (
                    <div className="py-20 text-center space-y-4 opacity-30">
                       <FaQuestionCircle size={60} className="mx-auto" />
                       <p className="font-black text-xs uppercase tracking-[0.3em]">No inquiries recorded yet</p>
                    </div>
                  ) : (
                    discussions.map(disco => (
                      <div key={disco.id} className={`space-y-3 ${disco.sender_type === 'staff' ? 'pr-8 border-r-2 border-blue-600/20 mr-2' : ''}`}>
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border uppercase ${disco.sender_type === 'staff' ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-600/10 text-blue-400 border-blue-500/10'}`}>
                                 {disco.sender_type === 'staff' ? 'T' : (disco.students?.name?.charAt(0) || 'S')}
                               </div>
                               <div>
                                  <p className="font-black text-white text-sm">
                                    {disco.sender_type === 'staff' ? (disco.staff_profiles?.full_name || 'المعلم') : disco.students?.name}
                                    {disco.sender_type === 'staff' && <span className="mr-2 text-[8px] bg-blue-600 px-2 py-0.5 rounded-full uppercase">Teacher</span>}
                                  </p>
                                  <p className="text-[9px] text-slate-500 font-bold">{new Date(disco.created_at).toLocaleString('ar-EG')}</p>
                               </div>
                            </div>
                            {disco.video_timestamp > 0 && disco.sender_type !== 'staff' && (
                              <div className="px-3 py-1.5 bg-white/5 rounded-lg text-emerald-400 text-[9px] font-black flex items-center gap-2">
                                 <FaClock size={8} /> {Math.floor(disco.video_timestamp / 60)}:{(Math.floor(disco.video_timestamp) % 60).toString().padStart(2, '0')}
                              </div>
                            )}
                         </div>
                         <div className={`p-6 rounded-[1.5rem] border relative ${disco.sender_type === 'staff' ? 'bg-blue-600/5 border-blue-600/10' : 'bg-white/[0.03] border-white/5'}`}>
                            <p className="text-slate-300 text-sm leading-relaxed font-bold">{disco.message}</p>
                            {disco.is_resolved && !disco.parent_id && <FaCheckCircle className="absolute -top-2 -left-2 text-emerald-500 bg-[#0d152a] rounded-full" size={20} />}
                         </div>
                      </div>
                    ))
                  )}
               </div>

               <div className="p-8 border-t border-white/5 bg-black/20">
                  <div className="relative">
                    <textarea 
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="اكتب سؤالك أو استفسارك هنا للمدرب..."
                      className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-[2rem] p-6 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all resize-none"
                    />
                    <button 
                      disabled={sendingComment || !newComment.trim()}
                      onClick={sendDiscussion}
                      className="absolute bottom-4 left-4 h-12 px-8 bg-blue-600 text-white rounded-xl font-black text-xs shadow-xl shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {sendingComment ? 'جاري الإرسال...' : 'إرسال السؤال'}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-600 font-black uppercase text-center mt-4 tracking-widest">Question will be linked to current video time</p>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>;
}

// 🏛️ Private Sub-Components
function LessonItem({ lesson, idx, isActive, isDone, isLocked, onClick }) {
  return <motion.button
      whileHover={{ x: -5 }}
      onClick={onClick}
      className={`w-full p-5 rounded-[2rem] border-2 transition-all flex items-start gap-4 text-right group
        ${isActive ? 'border-blue-600/50 bg-blue-600/10 shadow-2xl shadow-blue-900/20' : 'border-white/5 bg-white/[0.01] hover:bg-white/5'}
        ${isLocked ? 'opacity-60' : 'opacity-100'}
      `}
    >
      <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center shrink-0 text-xs font-black shadow-lg
        ${isDone ? 'bg-emerald-500 text-white shadow-emerald-900/40' 
        : isLocked ? 'bg-slate-800 text-slate-600'
        : isActive ? 'bg-blue-600 text-white' 
        : 'bg-white/5 text-slate-500'}
      `}>
        {isDone ? <FaCheckCircle size={16} /> 
        : isLocked ? <FaLock size={14} /> 
        : (idx + 1).toString().padStart(2, '0')}
      </div>
      
      <div className="flex-1 overflow-hidden">
         <p className={`font-black text-sm truncate mb-1 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-200 group-hover:text-white'}`}>{lesson.title}</p>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Digital Module</span>
               {lesson.is_free && <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-lg uppercase">Prerelease</span>}
            </div>
            {isLocked && lesson.price > 0 && (
              <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20">{lesson.price} ج.م</span>
            )}
         </div>
      </div>
    </motion.button>;
}

function AccessGate({ type, lesson, chapter, course, onGoPrev, onEnrol }) {
   if (type === 'sequential') return (
    <div className="aspect-video bg-[#020617] flex flex-col items-center justify-center text-white p-10 text-center relative overflow-hidden">
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/10 blur-[100px] pointer-events-none"></div>
       <div className="w-24 h-24 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-blue-500 mb-8 border border-blue-500/20 shadow-2xl"><FaLockOpen size={32} className="opacity-50" /></div>
       <h2 className="text-3xl font-black mb-4 tracking-tight">المحتوى قيد الانتظار ⛓️</h2>
       <p className="text-slate-500 max-w-sm mx-auto mb-10 font-black uppercase text-[10px] tracking-widest leading-loose">يجب إتمام المهمة السابقة أولاً لفتح هذا المستوى</p>
       <button onClick={onGoPrev} className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black shadow-2xl shadow-blue-900/40 transition-all flex items-center gap-3 group">
          <FaPlayCircle className="group-hover:animate-spin" /> ابدأ الدرس السابق: {lesson?.title}
       </button>
    </div>
   );

   return (
    <div className="aspect-video bg-[#020617] flex flex-col items-center justify-center text-white p-6 md:p-10 text-center relative overflow-hidden">
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/10 blur-[100px] pointer-events-none"></div>
       
       <div className="relative z-10 mb-6 md:mb-10">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600/10 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20 shadow-2xl"><FaLock size={24} /></div>
          <h2 className="text-2xl md:text-4xl font-black mb-4 tracking-tight">هذا المحتوى مغلق 🔒</h2>
          <p className="text-slate-500 max-w-lg mx-auto font-bold text-xs md:text-sm leading-relaxed mb-8">اختر الطريقة المناسبة لك لتفعيل المحتوى والاستمتاع بمشاهدة الحصة</p>
       </div>

       <div className="relative z-10 flex flex-wrap justify-center gap-4 w-full max-w-3xl">
          {/* Option 1: Unlock Lesson */}
          {lesson?.price > 0 && (
            <button onClick={() => onEnrol('lesson', lesson.id)} className="flex-1 min-w-[200px] p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all group group relative">
               <div className="absolute -top-3 right-6 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg">أرخص خيار</div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">تفعيل الحصة فقط</p>
               <h3 className="text-2xl font-black text-white">{lesson.price} <span className="text-[10px] opacity-40">ج.م</span></h3>
               <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black group-hover:text-blue-400">شراء الآن <FaChevronLeft size={8} /></div>
            </button>
          )}

          {/* Option 2: Unlock Chapter */}
          {chapter?.price > 0 && (
            <button onClick={() => onEnrol('chapter', chapter.id)} className="flex-1 min-w-[200px] p-6 bg-blue-600/10 border border-blue-500/30 rounded-[2rem] hover:bg-blue-600/20 transition-all group">
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">تفعيل الباب: {chapter.title}</p>
               <h3 className="text-2xl font-black text-white">{chapter.price} <span className="text-[10px] opacity-40">ج.م</span></h3>
               <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black group-hover:text-blue-400">توفير 15% <FaChevronLeft size={8} /></div>
            </button>
          )}

          {/* Option 3: Unlock Full Course */}
          <button onClick={() => onEnrol('course', course?.id)} className="flex-1 min-w-[200px] p-6 bg-gradient-to-r from-blue-600 to-indigo-700 border border-white/10 rounded-[2rem] hover:scale-105 transition-all shadow-2xl shadow-blue-900/40 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform"><FaRocket size={40} /></div>
             <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2">تفعيل الكورس بالكامل</p>
             <h3 className="text-2xl font-black text-white">
                {course?.original_price > course?.digital_full_price && (
                  <span className="text-sm font-bold text-blue-200/50 line-through ml-2">{course.original_price}</span>
                )}
                {course?.digital_full_price || 0} <span className="text-[10px] opacity-60">ج.م</span>
             </h3>
             <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black">الخيار الشامل <FaChevronLeft size={8} /></div>
          </button>
       </div>

       <button onClick={() => onEnrol('code')} className="relative z-10 mt-10 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em] underline decoration-slate-700 underline-offset-8">أو تفعيل بواسطة كود (سنتر)</button>
    </div>
   );
}
