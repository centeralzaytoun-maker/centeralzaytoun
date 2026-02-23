'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { useAuth } from '../../../context/AuthContext';
import { 
  FaBook, FaPlayCircle, FaLock, FaGraduationCap, 
  FaSearch, FaChevronLeft, FaStar 
} from 'react-icons/fa';
import Link from 'next/link';

export default function StudentCoursesPage() {
  const { user, centerId } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (centerId && user) {
      fetchData();
    }
  }, [centerId, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 0. جلب بيانات الطالب (الصف الدراسي)
      const { data: profile } = await supabase
        .from('students')
        .select('grade')
        .eq('id', user.id)
        .single();
      
      const studentGrade = profile?.grade;

      // 1. جلب الكورسات (فقط المتوافقة مع صف الطالب)
      let coursesQuery = supabase
        .from('courses')
        .select('*, instructors(name)')
        .eq('center_id', centerId);
      
      if (studentGrade) {
        coursesQuery = coursesQuery.eq('grade', studentGrade);
      }

      const { data: allCourses } = await coursesQuery;
      setCourses(allCourses || []);

      // 2. جلب اشتراكات الطالب الأونلاين
      const { data: enrollments } = await supabase
        .from('student_online_enrollments')
        .select('course_id')
        .eq('student_id', user.id);
      
      setMyEnrollments(enrollments?.map(e => e.course_id) || []);

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

  if (loading) return <div className="p-20 text-center animate-pulse">جاري تحميل المواد الرقمية...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 mb-20 md:mb-0" dir="rtl">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-10">
         <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
               <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                  <FaGraduationCap className="text-blue-600" /> أكاديمية كلاسورا الرقمية
               </h1>
               <p className="text-slate-500 font-bold mt-2">تصفح موادك الدراسية وشاهد حصصك في أي وقت</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-80 group">
               <FaSearch className="absolute top-4 right-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
               <input 
                 type="text"
                 placeholder="ابحث عن مادة أو مدرس..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full h-12 bg-white border-none rounded-2xl pr-12 pl-4 text-sm font-bold shadow-sm outline-none focus:ring-2 ring-blue-500/10 transition-all"
               />
            </div>
         </div>
      </div>

      {/* Course Grid */}
      <div className="max-w-6xl mx-auto space-y-12">
         
         {/* My Enrolled Courses Section */}
         <section>
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
               <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
               موادي المشترك بها
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               {filteredCourses.filter(c => myEnrollments.includes(c.id)).map((course) => (
                  <CourseCard key={course.id} course={course} isEnrolled={true} />
               ))}
               {filteredCourses.filter(c => myEnrollments.includes(c.id)).length === 0 && (
                  <div className="col-span-full py-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                     <p className="font-bold text-slate-400">لم تشترك في أي مواد بعد</p>
                  </div>
               )}
            </div>
         </section>

         {/* Available Courses Section */}
         <section>
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
               <span className="w-2 h-6 bg-slate-300 rounded-full"></span>
               كورسات متاحة لصفك الدراسي
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               {filteredCourses.filter(c => !myEnrollments.includes(c.id)).map((course) => (
                  <CourseCard key={course.id} course={course} isEnrolled={false} />
               ))}
            </div>
         </section>

         {filteredCourses.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
               <FaGraduationCap size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="font-bold text-slate-400">لا توجد مواد تطابق بحثك حالياً</p>
            </div>
         )}
      </div>

    </div>
  );
}

// Sub-component for Course Card 
function CourseCard({ course, isEnrolled }) {
  return (
    <Link 
       href={`/student/courses/${course.id}`}
       className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group"
     >
        {/* Thumbnail Placeholder */}
        <div className="h-48 bg-slate-900 relative overflow-hidden flex items-center justify-center">
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
           <FaBook className="text-slate-700 text-6xl opacity-20 transform -rotate-12" />
           
           <div className="absolute bottom-6 right-6 z-20">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 block">ملاحظة دراسية</span>
              <h3 className="text-white font-black text-xl">{course.name}</h3>
           </div>

           {/* Badges */}
           <div className="absolute top-6 left-6 z-20 flex flex-col gap-2 scale-90 origin-top-left">
              <span className="bg-white/10 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black border border-white/20">
                 {course.grade}
              </span>
              {isEnrolled && (
                <span className="bg-green-500/20 backdrop-blur-md text-green-400 px-3 py-1 rounded-full text-[10px] font-black border border-green-500/20 flex items-center gap-1">
                   <FaPlayCircle /> مشترك
                </span>
              )}
           </div>
        </div>

        {/* Content */}
        <div className="p-8">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                 <FaStar size={14} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">المدرس</p>
                 <h4 className="font-black text-slate-800 text-sm">مستر/ {course.instructors?.name || course.instructor}</h4>
              </div>
           </div>

           <div className={`w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all
             ${isEnrolled 
               ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
               : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}
           `}>
              {isEnrolled ? (
                <>ابدأ المشاهدة الآن <FaChevronLeft size={12} /></>
              ) : (
                <>تصفح المحتوى <FaLock size={12} className="opacity-40" /></>
              )}
           </div>
        </div>
     </Link>
  );
}
