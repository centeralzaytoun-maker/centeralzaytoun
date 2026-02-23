'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { useAuth } from '../../../context/AuthContext';
import { 
  FaTicketAlt, FaPlus, FaQrcode, FaTrash, 
  FaFileExcel, FaCopy, FaCheck, FaSyncAlt 
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

export default function VouchersPage() {
  const { centerId } = useAuth();
  const [courses, setCourses] = useState([]);
  const [stages, setStages] = useState([]); // 🆕 قائمة المراحل
  const [vouchers, setVouchers] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(''); // 🆕 الصف المختار
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    if (centerId) {
      fetchStages();
      fetchCourses();
      fetchVouchers();
    }
  }, [centerId]);

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
    const { data } = await supabase
      .from('courses')
      .select('id, name, grade, instructors(name)')
      .eq('center_id', centerId);
    setCourses(data || []);
  };

  // 🆕 الكورسات المفلترة بناءً على الصف المختار
  const filteredCourses = courses.filter(c => !selectedGrade || c.grade === selectedGrade);

  const fetchVouchers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('recharge_codes')
      .select('*, courses(name), students(name)')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });
    setVouchers(data || []);
    setLoading(false);
  };

  const generateVouchers = async () => {
    if (!selectedCourseId || count < 1) return alert('يرجى اختيار مادة وإدخال عدد صحيح');
    
    setLoading(true);
    const newVouchers = [];
    const prefix = 'CLS';
    
    for (let i = 0; i < count; i++) {
      const code = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      newVouchers.push({
        center_id: centerId,
        code,
        course_id: selectedCourseId,
        type: 'course_unlock',
        is_used: false
      });
    }

    const { error } = await supabase.from('recharge_codes').insert(newVouchers);
    
    if (!error) {
      alert(`تم توليد ${count} كود بنجاح ✅`);
      fetchVouchers();
    } else {
      alert('خطأ أثناء التوليد: ' + error.message);
    }
    setLoading(false);
  };

  const deleteVoucher = async (id) => {
    if (!confirm('هل أنت متأكد؟')) return;
    const { error } = await supabase.from('recharge_codes').delete().eq('id', id);
    if (!error) setVouchers(vouchers.filter(v => v.id !== id));
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exportToExcel = () => {
    const data = vouchers.map(v => ({
      'الكود': v.code,
      'المادة': v.courses?.name || 'غير محدد',
      'الحالة': v.is_used ? 'مستخدم' : 'متاح',
      'تاريخ التوليد': new Date(v.created_at).toLocaleDateString('ar-EG'),
      'استخدم بواسطة': v.students?.name || '-'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أكواد الشحن");
    XLSX.writeFile(wb, `vouchers_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
        <div>
           <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
             <FaTicketAlt className="text-amber-500" /> إدارة أكواد الشحن
           </h1>
           <p className="text-slate-500 text-sm mt-1">وّلد أكواد لبيع الكورسات في المكتبات والسناتر</p>
        </div>

        <button 
          onClick={exportToExcel}
          className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-700 transition"
        >
          <FaFileExcel /> تصدير لإكسيل
        </button>
      </div>

      {/* Generator Section */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mb-10">
         <h2 className="font-black text-slate-700 mb-6 flex items-center gap-2">
           <FaPlus className="text-blue-500 text-xs" /> توليد أكواد جديدة
         </h2>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
            {/* 🆕 فلتر الصف الدراسي */}
            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">الصف الدراسي</label>
               <select 
                 value={selectedGrade}
                 onChange={(e) => {
                   setSelectedGrade(e.target.value);
                   setSelectedCourseId('');
                 }}
                 className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-xs font-bold outline-none focus:ring-2 ring-blue-500/10 transition-all"
               >
                 <option value="">-- كل الصفوف --</option>
                 {stages.map(s => (
                   <option key={s.id} value={s.name}>{s.name}</option>
                 ))}
               </select>
            </div>

            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">المادة (المدرس)</label>
               <select 
                 value={selectedCourseId}
                 onChange={(e) => setSelectedCourseId(e.target.value)}
                 className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-xs font-bold outline-none focus:ring-2 ring-blue-500/10 transition-all"
               >
                 <option value="">-- اختر مادة --</option>
                 {filteredCourses.map(c => (
                   <option key={c.id} value={c.id}>
                     {c.name} - مستر/ {c.instructors?.name || 'مجهول'}
                   </option>
                 ))}
               </select>
            </div>

            <div>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">الكمية</label>
               <input 
                 type="number" min="1" max="1000"
                 value={count} onChange={(e) => setCount(parseInt(e.target.value))}
                 className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold outline-none"
               />
            </div>

            <button 
              onClick={generateVouchers}
              disabled={loading || !selectedCourseId}
              className="h-12 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> توليد الآن
            </button>
         </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-right">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                   <th className="px-6 py-4">الكود</th>
                   <th className="px-6 py-4">المادة</th>
                   <th className="px-6 py-4">الحالة</th>
                   <th className="px-6 py-4">استخدم بواسطة</th>
                   <th className="px-6 py-4">تاريخ التوليد</th>
                   <th className="px-6 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <code className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-mono text-xs font-bold">{v.code}</code>
                          <button 
                            onClick={() => copyToClipboard(v.code)}
                            className="text-slate-300 hover:text-blue-500 transition-colors"
                          >
                            {copiedCode === v.code ? <FaCheck className="text-green-500" /> : <FaCopy />}
                          </button>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{v.courses?.name || '-'}</td>
                    <td className="px-6 py-4">
                       <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${v.is_used ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                          {v.is_used ? 'مستخدم' : 'متاح'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{v.students?.name || '-'}</td>
                    <td className="px-6 py-4 text-[10px] text-slate-400 font-bold">{new Date(v.created_at).toLocaleDateString('ar-EG')}</td>
                    <td className="px-6 py-4">
                       {!v.is_used && (
                         <button onClick={() => deleteVoucher(v.id)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all">
                            <FaTrash size={12} />
                         </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
           {vouchers.length === 0 && !loading && (
             <div className="p-10 text-center text-slate-400 font-bold">لا توجد أكواد حالياً. ابدأ بتوليد بعض الأكواد!</div>
           )}
         </div>
      </div>

    </div>
  );
}
