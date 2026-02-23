'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { 
  FaVideo, FaFilePdf, FaPlus, FaTrash, FaEdit, 
  FaLayerGroup, FaPlayCircle, FaSave, FaTimes, FaLink
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';

export default function LessonsPage() {
  const { centerId, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState([]);
  const [stages, setStages] = useState([]); // 🆕 قائمة المراحل
  const [lessons, setLessons] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(''); // 🆕 الصف المختار
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
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

  useEffect(() => {
    if (centerId) {
      fetchStages();
      fetchCourses();
    }
  }, [centerId]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessons(selectedCourseId);
    } else {
      setLessons([]);
    }
  }, [selectedCourseId]);

  // 🆕 جلب المراحل الدراسية
  const fetchStages = async () => {
    const { data } = await supabase
      .from('educational_stages')
      .select('*')
      .eq('center_id', centerId)
      .order('sort_order', { ascending: true });
    setStages(data || []);
  };

  const fetchCourses = async () => {
    // 🆕 جلب اسم المدرس مع الكورس
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, grade, instructors(name)')
      .eq('center_id', centerId)
      .order('name');
    if (!error) setCourses(data || []);
    setLoading(false);
  };

  // 🆕 الكورسات المفلترة بناءً على الصف المختار
  const filteredCourses = courses.filter(c => !selectedGrade || c.grade === selectedGrade);

  const fetchLessons = async (courseId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    if (!error) setLessons(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return alert('يرجى اختيار مادة أولاً');

    const lessonData = {
      ...formData,
      course_id: selectedCourseId,
      center_id: centerId
    };

    let error;
    if (formData.id) {
      // Update
      const { error: err } = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', formData.id);
      error = err;
    } else {
      // Insert
      const { id, ...newData } = lessonData;
      const { error: err } = await supabase
        .from('lessons')
        .insert([newData]);
      error = err;
    }

    if (!error) {
      alert('تم حفظ الدرس بنجاح ✅');
      resetForm();
      fetchLessons(selectedCourseId);
    } else {
      alert('خطأ في الحفظ: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدرس؟')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (!error) {
      setLessons(lessons.filter(l => l.id !== id));
      alert('تم حذف الدرس');
    }
  };

  const handleEdit = (lesson) => {
    setFormData(lesson);
    setIsFormOpen(true);
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

  if (authLoading) return <div className="p-10 text-center animate-pulse">جاري التحميل...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto mb-20 md:mb-0" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
            <FaVideo className="text-blue-600" /> إدارة الـمحتوى الرقمي
          </h1>
          <p className="text-slate-500 text-sm mt-1">اربط الفيديوهات والمذكرات بالكورسات الحالية</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {/* 🆕 فلتر الصف الدراسي */}
          <div className="w-full md:w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 mr-1">الصف الدراسي</label>
            <select 
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedCourseId(''); // تصفير المادة عند تغيير الصف
              }}
              className="w-full h-11 border-2 border-slate-100 rounded-xl px-4 text-xs font-bold bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
            >
              <option value="">-- كل الصفوف --</option>
              {stages.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-64">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 mr-1">اختر المادة (المدرس)</label>
            <select 
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full h-11 border-2 border-slate-100 rounded-xl px-4 text-xs font-bold bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
            >
              <option value="">-- اختر مادة --</option>
              {filteredCourses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} - مستر/ {c.instructors?.name || 'مجهول'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedCourseId ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
               <FaLayerGroup size={40} />
            </div>
            <p className="text-slate-400 font-bold">يرجى اختيار مادة من الأعلى للبدء في إدارة دروسها</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* List of Lessons */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center px-2">
               <h2 className="font-black text-slate-700">قائمة الدروس المرفوعة ({lessons.length})</h2>
               {!isFormOpen && (
                 <button 
                  onClick={() => setIsFormOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition"
                 >
                   <FaPlus /> إضافة درس جديد
                 </button>
               )}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>)}
              </div>
            ) : lessons.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100">
                <p className="text-slate-400">لا توجد دروس حالياً في هذا الكورس.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800">{lesson.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400">
                           {lesson.video_url && <span className="flex items-center gap-1 text-red-500"><FaPlayCircle /> فيديو متاح</span>}
                           {lesson.pdf_url && <span className="flex items-center gap-1 text-blue-500"><FaFilePdf /> مذكرة PDF</span>}
                           {lesson.is_free && <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded">تجريبي مجاني</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(lesson)} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition">
                         <FaEdit />
                      </button>
                      <button onClick={() => handleDelete(lesson.id)} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition">
                         <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className={`lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg sticky top-8 transition-all ${isFormOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none hidden'}`}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-black text-slate-800">{formData.id ? 'تعديل الدرس' : 'إضافة درس جديد'}</h3>
               <button onClick={resetForm} className="text-slate-400"><FaTimes /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">عنوان الدرس</label>
                <input 
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-sm outline-none focus:ring-2 ring-blue-500/20"
                  placeholder="مثال: مقدمة في الهندسة"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">رابط الفيديو (يوتيوب/فيميو)</label>
                <div className="relative">
                  <FaLink className="absolute top-3.5 right-4 text-slate-300" />
                  <input 
                    type="url"
                    value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})}
                    className="w-full h-11 bg-slate-50 border-none rounded-xl pr-10 pl-4 text-xs outline-none focus:ring-2 ring-blue-500/20"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">مصدر الفيديو</label>
                    <select 
                      value={formData.video_provider} onChange={e => setFormData({...formData, video_provider: e.target.value})}
                      className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-xs outline-none"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                      <option value="bunny">Bunny.net</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">ترتيب الدرس</label>
                    <input 
                      type="number"
                      value={formData.order_index} onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})}
                      className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-sm outline-none"
                    />
                 </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 mr-1">رابط مذكرة PDF</label>
                <input 
                  type="url"
                  value={formData.pdf_url} onChange={e => setFormData({...formData, pdf_url: e.target.value})}
                  className="w-full h-11 bg-slate-50 border-none rounded-xl px-4 text-xs outline-none focus:ring-2 ring-blue-500/20"
                  placeholder="رابط الملف من Google Drive أو Supabase"
                />
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                 <input 
                   type="checkbox" id="isFree"
                   checked={formData.is_free} onChange={e => setFormData({...formData, is_free: e.target.checked})}
                   className="w-5 h-5 accent-blue-600"
                 />
                 <label htmlFor="isFree" className="text-sm font-bold text-slate-600 cursor-pointer">هذا الدرس متاح مجاناً كمعاينة</label>
              </div>

              <button 
                type="submit"
                className="w-full h-12 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <FaSave /> {formData.id ? 'حفظ التعديلات' : 'إضافة الدرس للمادة'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
