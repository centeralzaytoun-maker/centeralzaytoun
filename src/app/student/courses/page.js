'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { useAuth } from '../../../context/AuthContext';
import { 
  FaBook, FaPlayCircle, FaLock, FaGraduationCap, 
  FaSearch, FaChevronLeft, FaStar, FaFire, FaBolt, FaAward, FaGhost, FaMagic, FaArrowLeft, FaThLarge
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function StudentCoursesPage() {
  const { user, centerId } = useAuth();
  const [courses, setCourses] = useState([]);
  const [fullEnrollments, setFullEnrollments] = useState([]);
  const [partialEnrollments, setPartialEnrollments] = useState([]); // Array of course IDs that have at least one lesson/chapter unlocked
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseExamsCount, setCourseExamsCount] = useState({});
  const [centerSettings, setCenterSettings] = useState(null);
  const [centerType, setCenterType] = useState('center');

  useEffect(() => {
    if (centerId && user) {
      fetchData();
    }
  }, [centerId, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('students')
        .select('grade')
        .eq('id', user.id)
        .single();
      
      const studentGrade = profile?.grade;

      let coursesQuery = supabase
        .from('courses')
        .select('*, instructors(name)')
        .eq('center_id', centerId);
      
      if (studentGrade) {
        coursesQuery = coursesQuery.eq('grade', studentGrade);
      }

      const { data: allCourses } = await coursesQuery;
      setCourses(allCourses || []);

      // 1. Fetch Full Course Enrollments
      const { data: enrollments } = await supabase
        .from('student_online_enrollments')
        .select('course_id')
        .eq('student_id', user.id);
      
      const fullIds = enrollments?.map(e => e.course_id) || [];
      setFullEnrollments(fullIds);

      // 2. Fetch Partial Access (Lessons & Chapters)
      const [lessonAccess, chapterAccess] = await Promise.all([
        supabase.from('student_lesson_access').select('course_id').eq('student_id', user.id),
        supabase.from('student_chapter_access').select('course_id').eq('student_id', user.id)
      ]);

      const partialIds = [
        ...new Set([
          ...(lessonAccess.data?.map(l => l.course_id) || []),
          ...(chapterAccess.data?.map(c => c.course_id) || [])
        ])
      ];
      setPartialEnrollments(partialIds);

      // 3. Fetch Active Exams and Student Submissions
      const [examsRes, submissionsRes] = await Promise.all([
        supabase.from('exams').select('id, course_id').eq('is_published', true).eq('is_electronic', true),
        supabase.from('student_exam_submissions').select('exam_id').eq('student_id', user.id).in('status', ['completed', 'timed_out'])
      ]);

      const examsData = examsRes.data || [];
      const submittedExamIds = new Set(submissionsRes.data?.map(s => s.exam_id) || []);

      const counts = {};
      examsData.forEach(e => {
        if (!submittedExamIds.has(e.id)) {
           counts[e.course_id] = (counts[e.course_id] || 0) + 1;
        }
      });
      setCourseExamsCount(counts);

      // 4. Fetch Center Settings & Type
      const [settingsRes, centerRes] = await Promise.all([
        supabase.from('center_settings').select('*').eq('center_id', centerId).maybeSingle(),
        supabase.from('centers').select('center_type').eq('id', centerId).single()
      ]);

      if (settingsRes.data) setCenterSettings(settingsRes.data);
      if (centerRes.data) setCenterType(centerRes.data.center_type);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.instructors?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const myCourses = filteredCourses.filter(c => fullEnrollments.includes(c.id) || partialEnrollments.includes(c.id));
  const availableCourses = filteredCourses.filter(c => !fullEnrollments.includes(c.id) && !partialEnrollments.includes(c.id));

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-8">
       <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
          <FaGraduationCap className="absolute inset-0 m-auto text-blue-500 text-3xl animate-pulse" />
       </div>
       <p className="text-slate-400 font-bold tracking-widest uppercase text-xs animate-pulse">Initializing Academy Portal...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-12 pb-32 overflow-hidden selection:bg-blue-500/30" dir="rtl">
      
      {/* 🌌 Background Decoration */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] bg-blue-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[25rem] h-[25rem] bg-indigo-600/10 blur-[150px] rounded-full"></div>
      </div>

      {/* 🏔️ Header Section */}
      <header className="max-w-7xl mx-auto mb-16 relative">
          <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-10">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
               <div className="flex items-center gap-4 mb-4">
                  <div 
                    className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg"
                    style={{ 
                      backgroundColor: `${centerSettings?.primary_color || '#2563eb'}20`, 
                      color: centerSettings?.primary_color || '#2563eb',
                      borderColor: `${centerSettings?.primary_color || '#2563eb'}30`
                    }}
                  >
                    {centerType === 'instructor' ? (centerSettings?.instructor_name ? `أ/ ${centerSettings.instructor_name}` : 'Instructor Platform') : (centerSettings?.center_name || 'Nexus Academy')}
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: centerSettings?.primary_color || '#2563eb' }}></div>
                  <div className="flex gap-2 mr-auto lg:hidden">
                    <Link href="/portal/dashboard" className="flex items-center gap-2 text-[10px] font-black text-blue-400 hover:text-white transition-colors uppercase tracking-widest bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
                       <FaThLarge className="text-[8px]" /> المنصة
                    </Link>
                    <Link href="/student" className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                       <FaChevronLeft className="text-[8px]" /> التعريفية
                    </Link>
                  </div>
               </div>
               <div className="flex items-center gap-6 mb-4">
                  <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                     بوابة المناهج <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(to right, ${centerSettings?.primary_color || '#3b82f6'}, ${centerSettings?.secondary_color || '#6366f1'})` }}>الرقمية</span>
                  </h1>
                  <div className="hidden lg:flex items-center gap-3">
                    <Link href="/portal/dashboard" className="flex items-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-6 py-3 rounded-2xl border border-blue-500/20 transition-all font-black text-xs group">
                       <FaThLarge className="group-hover:rotate-12 transition-transform" /> لوحة البيانات
                    </Link>
                    <Link href="/student" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl border border-white/10 transition-all font-black text-xs group">
                       الصفحة التعريفية <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                  </div>
               </div>
               <p className="text-slate-500 font-bold mt-4 text-sm md:text-base max-w-xl">
                 {centerType === 'instructor' 
                   ? `أهلاً بك في المنصة الرسمية لـ أ/ ${centerSettings?.instructor_name || 'الأستاذ'}. استمتع بتجربة تعليمية فريدة.`
                   : 'استمتع بتجربة تعليمية فريدة في أكاديمية كلاسورا. شاهد دروسك، حمل ملزماتك، وناقش معلميك في مكان واحد.'}
               </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-96 group">
               <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl group-focus-within:bg-blue-500/40 transition-all opacity-0 group-focus-within:opacity-100"></div>
                  <FaSearch className="absolute top-1/2 -translate-y-1/2 right-6 text-slate-600 group-focus-within:text-blue-400 transition-colors" />
                  <input 
                    type="text"
                    placeholder="ابحث عن مادة، معلم، أو فصل..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-20 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] pr-16 pl-8 text-sm font-black text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                  />
               </div>
            </motion.div>
         </div>
      </header>

      {/* 🚀 Academy Content */}
      <main className="max-w-7xl mx-auto space-y-24">
         
         {/* 💎 SECTION: ENROLLED COURSES */}
         <section>
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-500/20"><FaFire size={20} /></div>
                  <div>
                    <h2 className="text-2xl font-black text-white italic">موادي الدراسية</h2>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1">Ready for the Next Lesson?</p>
                  </div>
               </div>
               <div className="h-px flex-1 mx-10 bg-gradient-to-r from-emerald-500/20 to-transparent hidden md:block"></div>
               <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10">{myCourses.length} ACTIVE</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 md:gap-12">
                <AnimatePresence mode="popLayout">
                   {myCourses.map((course, i) => {
                      const isFull = fullEnrollments.includes(course.id);
                      return (
                        <CourseCard
                          key={course.id}
                          course={course}
                          isEnrolled={true}
                          accessType={isFull ? 'full' : 'partial'}
                          index={i}
                          examsCount={courseExamsCount[course.id] || 0}
                        />
                      );
                   })}
                </AnimatePresence>
               {myCourses.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-24 text-center bg-white/[0.02] rounded-[3.5rem] border-2 border-dashed border-white/5 group hover:border-blue-500/20 transition-all">
                     <FaMagic size={40} className="mx-auto text-slate-800 mb-6 group-hover:text-blue-500/40 transition-all" />
                     <p className="font-black text-slate-700 uppercase tracking-[0.3em] text-xs">بداية الرحلة: لم تشترك في أي مواد بعد</p>
                  </motion.div>
               )}
            </div>
         </section>

         {/* ⚡ SECTION: DISCOVER COURSES */}
         {availableCourses.length > 0 && (
            <section>
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shadow-lg border border-blue-500/20"><FaBolt size={18} /></div>
                     <div>
                       <h2 className="text-2xl font-black text-white italic">استكشف المناهج</h2>
                       <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1">Expand your knowledge horizons</p>
                     </div>
                  </div>
                  <div className="h-px flex-1 mx-10 bg-gradient-to-r from-blue-500/20 to-transparent hidden md:block"></div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 md:gap-12">
                  {availableCourses.map((course, i) => (
                     <CourseCard key={course.id} course={course} isEnrolled={false} index={i} />
                  ))}
               </div>
            </section>
         )}

         {/* 🏆 Empty Global State */}
         {filteredCourses.length === 0 && !loading && (
            <div className="py-32 text-center rounded-[4rem] bg-white/[0.01] border border-white/5 relative overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>
               <FaGhost size={60} className="mx-auto text-slate-800 mb-8" />
               <h3 className="text-2xl font-black text-slate-600 mb-4">لا توجد نتائج تطابق بحثك</h3>
               <p className="text-slate-700 font-bold uppercase tracking-widest text-[10px]">Try adjusting your search criteria</p>
            </div>
         )}
      </main>

    </div>
  );
}

// 💎 THE ULTIMATE COURSE CARD 💎
function CourseCard({ course, isEnrolled, index, accessType, examsCount }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', damping: 20 }}
    >
      <Link
         href={`/student/courses/${course.id}`}
         className="group relative block"
       >
          {/* 🌈 Glow Effect Layer */}
          <div className={`absolute -inset-1 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-all duration-700 blur-[20px]
            ${isEnrolled ? 'bg-blue-600/20' : 'bg-slate-400/5'}`}></div>

          <div className="relative bg-[#0d152a] rounded-[3rem] border border-white/5 overflow-hidden transition-all duration-500 group-hover:border-white/10 group-hover:-translate-y-2 flex flex-col h-full">

             {/* 🖼️ Card Upper - Image/Visual */}
             <div className="h-56 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                   {course.thumbnail_url ? (
                     <img 
                       src={course.thumbnail_url} 
                       alt={course.name} 
                       className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                     />
                   ) : (
                     <div className="absolute inset-0 opacity-20 transition-transform duration-1000 group-hover:scale-110">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.4),transparent)]"></div>
                        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.2),transparent)]"></div>
                        <FaBook className="absolute inset-0 m-auto text-[8rem] text-white/5 transform -rotate-12 transition-all duration-700 group-hover:rotate-0 group-hover:text-blue-500/10" />
                     </div>
                   )}
                </div>

                {/* Visual Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d152a] via-[#0d152a]/20 to-transparent"></div>

                {/* Floating Meta */}
                <div className="absolute top-6 left-6 flex flex-col gap-3">
                   <div className="px-4 py-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{course.grade}</span>
                   </div>
                    {isEnrolled && (
                       <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={`px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 ${accessType === 'full' ? 'bg-emerald-500/90' : 'bg-amber-500/90'} text-white`}>
                         <FaBolt size={10} />
                         <span className="text-[10px] font-black uppercase italic">
                            {accessType === 'full' ? 'وصول كامل' : 'وصول جزئي'}
                         </span>
                       </motion.div>
                    )}
                </div>

                 {/* Course ID/Code Badge */}
                 <div className="absolute bottom-6 right-8">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-1">اسم المادة</p>
                    <h3 className="text-2xl font-black text-white leading-none tracking-tight group-hover:text-blue-400 transition-colors uppercase">{course.name}</h3>
                 </div>

                 {/* 📊 Exams Notification Badge */}
                 {examsCount > 0 && (
                    <div className="absolute top-6 right-6 flex items-center gap-2 bg-pink-600 px-4 py-2 rounded-2xl shadow-2xl shadow-pink-900/40 border-b-4 border-pink-800 animate-bounce">
                       <FaBolt size={10} className="text-white" />
                       <span className="text-[10px] font-black text-white">{examsCount} اختبار جديد</span>
                    </div>
                 )}
              </div>

             {/* 📝 Card Lower - Info */}
             <div className="p-10 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-8 group/inst">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover/inst:border-blue-500/30 group-hover/inst:text-blue-400 transition-all duration-500">
                         <FaAward size={22} className="opacity-40 group-hover/inst:opacity-100" />
                      </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">المعلم</p>
                          <h4 className="font-black text-slate-200 text-base">{course.instructors?.name || 'مدرس المادة'}</h4>
                       </div>
                   </div>
                   <div className="bg-white/[0.03] w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
                      <FaStar className="text-slate-800 group-hover:text-amber-400 transition-colors" />
                   </div>
                </div>

                 <div className="mt-auto pt-6 border-t border-white/5">
                    <div className={`w-full h-16 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-500
                      ${isEnrolled
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden group/btn'
                        : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/10 hover:text-white'}
                    `}>
                        {isEnrolled ? (
                          <>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform origin-left scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-1000"></div>
                            <FaPlayCircle size={16} className="animate-pulse" /> دخول المحتوى <FaChevronLeft size={10} className="animate-bounce-x" />
                          </>
                        ) : (
                          <>تفعيل الكورس <FaLock size={12} className="opacity-40" /></>
                        )}
                    </div>
                 </div>
             </div>
          </div>
       </Link>
     </motion.div>
  );
}
