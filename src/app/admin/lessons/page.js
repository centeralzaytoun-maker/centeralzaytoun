'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { 
  FaVideo, FaFilePdf, FaPlus, FaTrash, FaEdit, 
  FaLayerGroup, FaPlayCircle, FaSave, FaTimes, FaLink,
  FaArrowLeft, FaCheckCircle, FaGlobe, FaLock, FaSortAmountDown,
  FaEye, FaSearch, FaChevronDown, FaYoutube, FaVimeoV, FaCloud, FaFilter
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function LessonsPage() {
  const { centerId, role, allowedFeatures, loading: authLoading } = useAuth();
  
  // 📊 Core States
  const [courses, setCourses] = useState([]);
  const [stages, setStages] = useState([]); 
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 🔍 Filter States
  const [selectedGrade, setSelectedGrade] = useState(''); 
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 🪄 UI States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // 📝 Form State
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    description: '',
    video_url: '',
    video_provider: 'youtube',
    pdf_url: '',
    is_free: false,
    order_index: 0
  });

  // 🛡️ Route Protection
  useEffect(() => {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('academic:sessions')) {
        // window.location.href = '/admin/dashboard';
    }
  }, [allowedFeatures, authLoading]);

  useEffect(() => {
    if (centerId) {
      fetchInitialData();
    }
  }, [centerId]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessons(selectedCourseId);
    } else {
      setLessons([]);
    }
  }, [selectedCourseId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [stagesRes, coursesRes] = await Promise.all([
        supabaseBrowser.from('educational_stages').select('*').eq('center_id', centerId).order('sort_order', { ascending: true }),
        supabaseBrowser.from('courses').select('id, name, grade, instructors(name)').eq('center_id', centerId).order('name')
      ]);

      setStages(stagesRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (error) {
      toast.error('خطأ في تحميل البيانات الأساسية');
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (courseId) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowser
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (!error) setLessons(data || []);
    } catch (error) {
      toast.error('خطأ في تحميل الدروس');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(c => !selectedGrade || c.grade === selectedGrade);
  }, [courses, selectedGrade]);

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => 
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lessons, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: lessons.length,
      free: lessons.filter(l => l.is_free).length,
      video: lessons.filter(l => l.video_url).length,
      pdf: lessons.filter(l => l.pdf_url).length
    };
  }, [lessons]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return toast.error('يرجى اختيار مادة أولاً');
    
    setIsSaving(true);
    const lessonData = {
      ...formData,
      course_id: selectedCourseId,
      center_id: centerId
    };

    try {
      let error;
      if (formData.id) {
        const { error: err } = await supabaseBrowser
          .from('lessons')
          .update(lessonData)
          .eq('id', formData.id);
        error = err;
      } else {
        const { id, ...newData } = lessonData;
        const { error: err } = await supabaseBrowser
          .from('lessons')
          .insert([newData]);
        error = err;
      }

      if (!error) {
        toast.success(formData.id ? 'تم تحديث الدرس' : 'تمت إضافة الدرس بنجاح');
        resetForm();
        fetchLessons(selectedCourseId);
      } else {
        throw error;
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدرس نهائياً؟')) return;
    try {
      const { error } = await supabaseBrowser.from('lessons').delete().eq('id', id);
      if (!error) {
        setLessons(prev => prev.filter(l => l.id !== id));
        toast.success('تم حذف الدرس');
      } else {
        throw error;
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const handleEdit = (lesson) => {
    setFormData(lesson);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({
      id: null,
      title: '',
      description: '',
      video_url: '',
      video_provider: 'youtube',
      pdf_url: '',
      is_free: false,
      order_index: lessons.length
    });
    setIsFormOpen(false);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-black animate-pulse">جاري التحقق من الصلاحيات...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-cairo" dir="rtl">
      <Toaster position="top-center" />
      
      <div className="max-w-7xl mx-auto">
        {/* 🏔️ Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-5">
            <Link 
              href="/admin/dashboard" 
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm border border-slate-100 group"
            >
              <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-600/10 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Content Studio 2.0</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                المحتوى الرقمي <span className="text-blue-600">والدروس</span>
              </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`h-14 px-6 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-sm border ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200'}`}
            >
              <FaFilter /> الفلاتر
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setIsFormOpen(!isFormOpen); if(!isFormOpen) setFormData({id:null, title:'', description:'', video_url:'', video_provider:'youtube', pdf_url:'', is_free:false, order_index: lessons.length}); }}
              className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl shadow-slate-200 hover:bg-black transition-all"
            >
              <FaPlus /> {isFormOpen ? 'إغلاق المحرر' : 'إضافة درس جديد'}
            </motion.button>
          </div>
        </div>

        {/* 📊 Quick Stats */}
        {selectedCourseId && lessons.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'إجمالي الدروس', value: stats.total, color: 'blue', icon: <FaLayerGroup /> },
              { label: 'فيديوهات مرفوعة', value: stats.video, color: 'red', icon: <FaPlayCircle /> },
              { label: 'مذكرات متوفرة', value: stats.pdf, color: 'emerald', icon: <FaFilePdf /> },
              { label: 'محتوى تجريبي', value: stats.free, color: 'amber', icon: <FaGlobe /> },
            ].map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                key={stat.label} 
                className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden"
              >
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center text-lg`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
                </div>
                <div className={`absolute -bottom-4 -right-4 w-16 h-16 bg-${stat.color}-500/5 rounded-full blur-xl`}></div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 🔍 Selection & Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm mb-10 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">الصف الدراسي</label>
                  <div className="relative">
                    <select 
                      value={selectedGrade}
                      onChange={(e) => { setSelectedGrade(e.target.value); setSelectedCourseId(''); }}
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 ring-blue-500/10 transition-all appearance-none"
                    >
                      <option value="">-- كل الصفوف --</option>
                      {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <FaChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">المادة والمدرس</label>
                  <div className="relative">
                    <select 
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 ring-blue-500/10 transition-all appearance-none"
                    >
                      <option value="">-- اختر مادة للتحكم في دروسها --</option>
                      {filteredCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - أ/ {c.instructors?.name || 'مجهول'}</option>
                      ))}
                    </select>
                    <FaChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>

                {selectedCourseId && (
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">بحث في الدروس</label>
                    <div className="relative">
                      <FaSearch className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ابحث بالعنوان أو الوصف..."
                        className="w-full h-14 bg-slate-50 border-none rounded-2xl pr-12 pl-4 text-sm font-bold outline-none focus:ring-2 ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* 📝 Form Section */}
          <AnimatePresence>
            {isFormOpen && (
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="lg:col-span-4 bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px]"></div>
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <span className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center"><FaEdit size={16} /></span>
                    {formData.id ? 'تحرير محتوى الدرس' : 'إستوديو إضافة درس'}
                  </h3>
                  <button onClick={resetForm} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all"><FaTimes /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 mr-1">عنوان الدرس الاحترافي</label>
                    <input 
                      type="text" required
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50 transition-all text-white backdrop-blur-md"
                      placeholder="مثال: أساسيات المشتقات والكامل"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 mr-1">وصف موجز (اختياري)</label>
                    <textarea 
                      value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50 transition-all text-white backdrop-blur-md resize-none"
                      placeholder="اشرح للطالب ماذا سيتعلم في هذا الدرس..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 mr-1">مزود الفيديو</label>
                      <div className="relative">
                        <select 
                          value={formData.video_provider} onChange={e => setFormData({...formData, video_provider: e.target.value})}
                          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-xs font-bold outline-none focus:ring-2 ring-blue-500/50 transition-all appearance-none"
                        >
                          <option value="youtube" className="bg-slate-900">YouTube</option>
                          <option value="vimeo" className="bg-slate-900">Vimeo</option>
                          <option value="bunny" className="bg-slate-900">Bunny.net (Premium)</option>
                          <option value="link" className="bg-slate-900">Direct MP4 Link</option>
                        </select>
                        <FaChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 mr-1">ترتيب الظهور</label>
                      <input 
                        type="number"
                        value={formData.order_index} onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-bold outline-none focus:ring-2 ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 mr-1">رابط الفيديو</label>
                    <div className="relative">
                      <FaLink className="absolute top-1/2 -translate-y-1/2 right-5 text-white/20" />
                      <input 
                        type="url"
                        value={formData.video_url || ''} onChange={e => setFormData({...formData, video_url: e.target.value})}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pr-12 pl-4 text-xs font-medium outline-none focus:ring-2 ring-blue-500/50 transition-all"
                        placeholder="انسخ الرابط هنا..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 mr-1">رابط المذكرة PDF</label>
                    <div className="relative">
                      <FaFilePdf className="absolute top-1/2 -translate-y-1/2 right-5 text-white/20" />
                      <input 
                        type="url"
                        value={formData.pdf_url || ''} onChange={e => setFormData({...formData, pdf_url: e.target.value})}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pr-12 pl-4 text-xs font-medium outline-none focus:ring-2 ring-blue-500/50 transition-all"
                        placeholder="رابط ملف PDF من الدرايف أو سحابة كلاوزورا..."
                      />
                    </div>
                  </div>

                  <div 
                    onClick={() => setFormData({...formData, is_free: !formData.is_free})}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${formData.is_free ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.is_free ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>
                        {formData.is_free ? <FaGlobe size={14} /> : <FaLock size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-black">إتاحة للجميع (تجريبي)</p>
                        <p className="text-[9px] text-white/40 font-bold">هذا الدرس سيظهر للطلاب مجاناً بدون شتراك</p>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-all ${formData.is_free ? 'bg-emerald-500' : 'bg-white/20'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_free ? 'left-1' : 'right-1'}`}></div>
                    </div>
                  </div>

                  <button 
                    disabled={isSaving}
                    type="submit"
                    className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-blue-900 transition-all flex items-center justify-center gap-3 group"
                  >
                    {isSaving ? (
                      <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <FaSave /> {formData.id ? 'تحديث البيانات' : 'اعتماد ونشر الدرس'}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 📜 Lessons Tree List */}
          <div className={`${isFormOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6 transition-all duration-500`}>
            {!selectedCourseId ? (
              <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-24 text-center">
                <motion.div 
                   animate={{ y: [0, -10, 0] }}
                   transition={{ duration: 4, repeat: Infinity }}
                   className="w-32 h-32 bg-blue-50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 text-blue-200"
                >
                   <FaLayerGroup size={60} />
                </motion.div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">في انتظار اختيار المادة...</h3>
                <p className="text-slate-400 font-bold max-w-sm mx-auto">ابدأ باختيار الصف والمادة من القائمة العلوية لإدارة المحتوى التعليمي الخاص بها</p>
              </div>
            ) : (
              <div className="p-2">
                <div className="flex justify-between items-center mb-8 px-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">خارطة دروس المادة</h2>
                    <p className="text-xs font-bold text-slate-400">تحكم في تسلسل المحتوى ووسائط الفيديو والـ PDF</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                        {filteredLessons.length} دروس
                     </span>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-28 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse"></div>
                    ))}
                  </div>
                ) : filteredLessons.length === 0 ? (
                  <div className="bg-white p-20 text-center rounded-[3rem] border border-slate-100 border-dashed">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                      <FaVideo size={30} />
                    </div>
                    <p className="text-slate-400 font-black">لا توجد دروس مرفوعة حتى الآن لهذه المادة.</p>
                    <button onClick={() => setIsFormOpen(true)} className="mt-4 text-blue-600 font-black text-xs hover:underline decoration-2">إضافة أول درس الآن</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredLessons.map((lesson, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={lesson.id} 
                        className="bg-white p-5 md:p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between group hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all relative overflow-hidden"
                      >
                        {lesson.is_free && (
                          <div className="absolute top-0 right-10 bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-b-xl uppercase tracking-widest shadow-sm">
                            Free Preview
                          </div>
                        )}
                        
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="relative">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center font-black text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                              {lesson.order_index || idx + 1}
                            </div>
                            {lesson.video_url && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                                <FaPlayCircle size={10} />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-black text-lg text-slate-800 mb-1 group-hover:text-blue-600 transition-colors uppercase">{lesson.title}</h4>
                            <div className="flex flex-wrap items-center gap-3">
                               <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 group-hover:bg-white transition-all uppercase">
                                  {lesson.video_provider === 'youtube' && <FaYoutube className="text-red-600" />}
                                  {lesson.video_provider === 'vimeo' && <FaVimeoV className="text-blue-400" />}
                                  {lesson.video_provider === 'bunny' && <FaCloud className="text-indigo-500" />}
                                  {lesson.video_provider || 'Video Content'}
                               </div>
                               
                               {lesson.pdf_url && (
                                 <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 group-hover:bg-white transition-all uppercase tracking-tighter">
                                   <FaFilePdf /> Study Materials Included
                                 </div>
                               )}

                               {lesson.is_free && (
                                 <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 group-hover:bg-white transition-all uppercase">
                                   <FaGlobe /> Public
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6 md:mt-0 w-full md:w-auto justify-end">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEdit(lesson)} 
                            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 rounded-2xl border border-slate-100 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                            title="تعديل"
                          >
                             <FaEdit size={16} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(lesson.id)} 
                            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 rounded-2xl border border-slate-100 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                            title="حذف"
                          >
                             <FaTrash size={16} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        .font-cairo { font-family: 'Cairo', sans-serif; }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}
