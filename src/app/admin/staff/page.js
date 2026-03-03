'use client';
import { useState, useEffect } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId
import { FaUserPlus, FaTrash, FaUserShield, FaUserTie, FaSpinner, FaTimes, FaClock, FaCheck } from 'react-icons/fa';

export default function StaffPage() {
  const { centerId, user } = useAuth(); // ← استخراج centerId من الـ context
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // بيانات الفورم
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'staff'
  });

  // تعديل وقت الحضور المتوقع
  const [editingTime, setEditingTime] = useState(null); // { id, time, tolerance }

  useEffect(() => {
    if (centerId) {
      fetchStaff();
    }
  }, [centerId]);

  const fetchStaff = async () => {
    if (!centerId) return;
    
    try {
      const { data, error } = await supabaseBrowser
        .from('staff_profiles')
        .select('*')
        .eq('center_id', centerId) // ← فلترة حسب المركز
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // نكلم الـ API اللي عملناه عشان ينشئ اليوزر
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          centerId: centerId // ← إضافة centerId للـ request
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // 🕵️ سجل التدقيق (Audit Log)
      await supabaseBrowser.from('audit_logs').insert({
          table_name: 'staff_profiles',
          record_id: result.user?.user?.id,
          action: 'INSERT',
          user_id: user?.id,
          center_id: centerId,
          new_data: { details: `تسجيل موظف جديد: ${formData.fullName}`, role: formData.role, email: formData.email }
      });

      alert("تم إضافة الموظف بنجاح ✅");
      setIsModalOpen(false);
      setFormData({ fullName: '', email: '', password: '', role: 'staff' });
      fetchStaff(); // تحديث القائمة

    } catch (error) {
      alert("خطأ: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموظف نهائياً؟")) return;

    const member = staff.find(s => s.id === id);

    try {
      // 🕵️ سجل التدقيق (Audit Log)
      await supabaseBrowser.from('audit_logs').insert({
          table_name: 'staff_profiles',
          record_id: id,
          action: 'DELETE',
          user_id: user?.id,
          center_id: centerId,
          old_data: member,
          new_data: { details: `حذف موظف: ${member?.full_name || 'مجهول'}` }
      });

      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setStaff(staff.filter(s => s.id !== id));
      alert("تم الحذف بنجاح 🗑️");
    } catch (error) {
      alert("فشل الحذف: " + error.message);
    }
  };

  // ── تحديث وقت الحضور المتوقع ──
  const handleUpdateCheckInTime = async (staffId) => {
    if (!editingTime) return;
    try {
      const { error } = await supabaseBrowser
        .from('staff_profiles')
        .update({
          expected_check_in:  editingTime.time,
          late_tolerance_min: parseInt(editingTime.tolerance) || 15
        })
        .eq('id', staffId);
      if (error) throw error;
      setStaff(prev => prev.map(s =>
        s.id === staffId
          ? { ...s, expected_check_in: editingTime.time, late_tolerance_min: editingTime.tolerance }
          : s
      ));
      setEditingTime(null);
      alert('✅ تم حفظ وقت الحضور بنجاح');
    } catch (e) {
      alert('❌ خطأ أثناء الحفظ: ' + e.message);
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-2 md:p-0 pb-24 md:pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
        <div>
           <h1 className="text-xl md:text-3xl font-black text-gray-800 flex items-center gap-3">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
               <FaUserShield className="text-lg md:text-xl" />
             </div>
             إدارة الموظفين
           </h1>
           <p className="text-gray-400 text-[10px] md:text-xs font-bold mt-2 leading-relaxed">يمكنك إضافة سكرتارية، مدرسين، أو مسؤولين للنظام والتحكم في صلاحياتهم</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-gray-200 hover:bg-black hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95 text-sm md:text-base"
        >
          <FaUserPlus /> موظف جديد
        </button>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <FaSpinner className="animate-spin text-blue-500 text-3xl" />
          <p className="text-gray-400 font-bold text-sm">جاري تحميل البيانات...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 mx-2">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaUserTie size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-400 font-black text-sm md:text-base">لا يوجد موظفين مسجلين حالياً</p>
          <p className="text-gray-300 text-xs font-bold mt-1">ابدأ بإضافة أول موظف للمركز</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-2 md:px-0">
          {staff.map((member) => (
            <div key={member.id} className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col">
               {/* Badge للصلاحية */}
               <div className="flex justify-between items-start mb-6">
                 <div className={`px-3 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                   member.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                 }`}>
                   {member.role === 'admin' ? 'مدير عام' : 'موظف / سكرتارية'}
                 </div>
                 <button 
                    onClick={() => handleDelete(member.id)}
                    className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm group-hover:scale-110 active:scale-90"
                    title="حذف الموظف"
                 >
                    <FaTrash size={12} />
                 </button>
               </div>

               <div className="flex items-center gap-4 mb-2">
                 <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center text-xl md:text-2xl shadow-inner shrink-0 ${
                    member.role === 'admin' ? 'bg-purple-100/50 text-purple-600' : 'bg-blue-100/50 text-blue-600'
                 }`}>
                    {member.role === 'admin' ? <FaUserShield /> : <FaUserTie />}
                 </div>
                 <div className="overflow-hidden">
                    <h3 className="font-black text-gray-800 text-sm md:text-lg truncate leading-tight">{member.full_name}</h3>
                    <p className="text-[9px] md:text-[10px] text-gray-400 font-bold opacity-70 mt-1 uppercase tracking-tighter">ID: {member.id.split('-')[0]}</p>
                 </div>
               </div>
               
               <div className="mt-auto pt-6">
                 <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
                    <p className="text-[10px] text-gray-400 font-bold text-center">تاريخ الانضمام</p>
                    <p className="text-[11px] text-gray-700 font-black text-center mt-0.5" dir="ltr">
                      {new Date(member.created_at).toLocaleDateString('ar-EG')}
                    </p>
                 </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal إضافة موظف */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[5000] flex items-end md:items-center justify-center p-0 md:p-4">
           <div className="bg-white w-full max-w-md p-6 md:p-10 rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[95vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl md:text-2xl font-black text-gray-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <FaUserPlus />
                  </div>
                  تسجيل موظف
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              
              <form onSubmit={handleCreateUser} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] md:text-[11px] font-black text-gray-400 block uppercase tracking-wider mr-1">الاسم بالكامل</label>
                    <input 
                      required 
                      className="w-full h-14 px-5 bg-white rounded-2xl font-black text-sm border-2 border-gray-100 focus:border-blue-500 outline-none transition-all shadow-sm text-gray-900 appearance-none opacity-100 placeholder:text-gray-400"
                      placeholder="مثال: أحمد محمد"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] md:text-[11px] font-black text-gray-400 block uppercase tracking-wider mr-1">البريد الإلكتروني (للدخول)</label>
                    <input 
                      type="email" required 
                      className="w-full h-14 px-5 bg-white rounded-2xl font-black text-sm border-2 border-gray-100 focus:border-blue-500 outline-none transition-all shadow-sm text-gray-900 appearance-none opacity-100 placeholder:text-gray-400"
                      placeholder="employee@smart.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] md:text-[11px] font-black text-gray-400 block uppercase tracking-wider mr-1">كلمة المرور</label>
                    <input 
                      type="text" required minLength={6}
                      className="w-full h-14 px-5 bg-white rounded-2xl font-black text-sm border-2 border-gray-100 focus:border-blue-500 outline-none transition-all shadow-sm text-gray-900 appearance-none opacity-100 placeholder:text-gray-400"
                      placeholder="يفضل كلمة مرور قوية"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] md:text-[11px] font-black text-gray-400 block uppercase tracking-wider mr-1">صلاحية الوصول</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                         type="button"
                         onClick={() => setFormData({...formData, role: 'staff'})}
                         className={`h-14 rounded-2xl font-black text-[10px] md:text-xs border-2 transition-all shadow-sm flex flex-col items-center justify-center leading-tight ${
                           formData.role === 'staff' 
                           ? 'border-blue-600 bg-blue-50 text-blue-700' 
                           : 'border-gray-50 bg-gray-50 text-gray-400'
                         }`}
                       >
                         <span>موظف</span>
                         <span className="opacity-50 font-bold text-[9px] mt-0.5">سكرتارية / مساعد</span>
                       </button>
                       <button 
                         type="button"
                         onClick={() => setFormData({...formData, role: 'admin'})}
                         className={`h-14 rounded-2xl font-black text-[10px] md:text-xs border-2 transition-all shadow-sm flex flex-col items-center justify-center leading-tight ${
                           formData.role === 'admin' 
                           ? 'border-purple-600 bg-purple-50 text-purple-700' 
                           : 'border-gray-50 bg-gray-50 text-gray-400'
                         }`}
                       >
                         <span>مدير عام</span>
                         <span className="opacity-50 font-bold text-[9px] mt-0.5">Admin Full Access</span>
                       </button>
                    </div>
                 </div>

                 <div className="pt-6 flex flex-col sm:flex-row gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="w-full bg-gray-100 text-gray-500 h-14 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95 order-2 sm:order-1"
                    >
                      إلغاء
                    </button>
                    <button 
                      disabled={processing}
                      className="w-full bg-gray-900 text-white h-14 rounded-2xl font-black hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-gray-200 order-1 sm:order-2"
                    >
                      {processing ? <FaSpinner className="animate-spin"/> : <><FaUserPlus /> حفظ الموظف</>}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}