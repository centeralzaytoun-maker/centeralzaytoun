'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabaseBrowser } from '../../../../lib/supabase';
import { 
  FaExclamationTriangle, FaSearch, FaWhatsapp, FaCheckCircle, 
  FaArrowRight, FaFileExcel, FaUndo, FaFileDownload 
} from 'react-icons/fa';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../../context/AuthContext'; // ← استخدام الـ context للحصول على centerId
import { calculateRequiredPayment } from '../../../../utils/sessionCalculations';

export default function DebtsPage() {
  const { centerId, allowedFeatures, loading: authLoading } = useAuth(); // 🛡️ Get permissions
  const [permissionChecked, setPermissionChecked] = useState(false);

  // 🛡️ Route Protection
  useEffect(() => {
    if (authLoading) return;
    
    if (allowedFeatures && !allowedFeatures.includes('page_finance_debts')) {
       // window.location.href = '/admin/dashboard'; // Force redirect if Router fails
       // But we stick to useEffect logic, maybe just return null rendering.
       // Actually let's just use the existing loading state or return null.
    } else {
        setPermissionChecked(true);
    }
  }, [allowedFeatures, authLoading]);
  

  
  // التحقق من وجود centerId قبل تشغيل أي دوال
  useEffect(() => {
    if (!centerId) {
      console.log('❌ No centerId found - waiting for authentication...');
      return;
    }
    console.log('✅ centerId available:', centerId);
  }, [centerId]);
  
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [centerConfig, setCenterConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // 1. جلب البيانات من السيرفر عند تحميل الصفحة بشكل متوازي
  useEffect(() => {
    if (!centerId) return;
    
    async function fetchData() {
      try {
        setLoading(true);
        const [sessRes, studRes, courRes, subsRes, configRes] = await Promise.all([
          supabaseBrowser.from('sessions').select('*').eq('center_id', centerId).order('created_at', { ascending: false }),
          supabaseBrowser.from('students').select('*').eq('center_id', centerId),
          supabaseBrowser.from('courses').select('id, name, instructor, instructors(id, name), grade').eq('center_id', centerId),
          supabaseBrowser.from('student_subscriptions').select('*').eq('center_id', centerId),
          supabaseBrowser.from('center_settings').select('*').eq('center_id', centerId).maybeSingle()
        ]);

        setSessions(sessRes.data || []);
        setStudents(studRes.data || []);
        setCourses(courRes.data || []);
        setSubscriptions(subsRes.data || []);
        setCenterConfig(configRes.data);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [centerId]);

  // 2. حساب المديونيات بشكل آلي
  const allDebts = useMemo(() => {
    let debts = [];
    sessions.forEach(session => {
      if (session.payments) {
        Object.entries(session.payments).forEach(([studentId, paidAmount]) => {
          const student = students.find(s => s.unique_id === studentId || s.id === studentId);
          if (!student) return;

          const course = courses.find(c => c.id === session.course_id);
          
          // التأكد من وجود أي اشتراك نشط يغطي تاريخ الحصة
          // ملاحظة: نستخدم student.id (الـ UUID) للبحث في جدول الاشتراكات لضمان الدقة
          const studentSubs = (subscriptions || []).filter(s => s.student_id === student.id && s.course_id === session.course_id);
          const activeSub = studentSubs.find(sub => {
            if (!sub.expires_at) return false;
            const expiryDate = new Date(sub.expires_at);
            expiryDate.setHours(23, 59, 59, 999); // نهاية يوم الانتهاء
            return expiryDate >= new Date(session.created_at);
          });
          
          const isPaidMonthly = !!activeSub;

          const required = calculateRequiredPayment(student, session, isPaidMonthly);
          const paid = parseFloat(paidAmount) || 0;
          const debtValue = required - paid;

          if (debtValue > 0) {
            debts.push({
              id: `${session.id}-${studentId}`,
              studentName: student?.name || 'طالب محذوف',
              studentPhone: student?.parent_phone || '',
              courseName: course?.name || '---',
              instructor: course?.instructors?.name || course?.instructor || '---',
              grade: course?.grade || 'غير محدد',
              amount: debtValue,
              sessionId: session.id,
              studentUid: studentId,
              date: session.created_at,
              status: student.center_only_courses?.includes(session.course_id) ? 'centerOnly' : 
                     (isPaidMonthly ? 'monthly' : 
                     (student.course_discounts?.[session.course_id] > 0 ? 'discount' : 'regular')),
              isMonthlyCourse: student.monthly_courses?.includes(session.course_id) || student.subscription_type === 'شهري',
              isPaidMonthly,
              studentId: student.id // نستخدم الـ ID الحقيقي للبحث لاحقاً
            });
          }
        });
      }
    });
    return debts;
  }, [sessions, students, courses, subscriptions]);

  // 3. تعريف قوائم الفلاتر
  const availableGrades = useMemo(() => [...new Set(allDebts.map(d => d.grade))].filter(Boolean).sort(), [allDebts]);
  const availableCourses = useMemo(() => [...new Set(allDebts.map(d => d.courseName))].filter(Boolean).sort(), [allDebts]);
  const availableInstructors = useMemo(() => [...new Set(allDebts.map(d => d.instructor))].filter(Boolean).sort(), [allDebts]);

  // 🛡️ Rendering Logic moved after hooks
  if (authLoading || (allowedFeatures && !allowedFeatures.includes('page_finance_debts'))) {
    if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_finance_debts')) {
         return (
             <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-red-500">
                 <FaExclamationTriangle size={48} className="mb-4" />
                 <h1 className="text-2xl font-bold">غير مصرح لك بالدخول لهذه الصفحة 🔒</h1>
                 <Link href="/admin/dashboard" className="mt-4 text-blue-600 underline">العودة للرئيسية</Link>
             </div>
         );
    }
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 italic text-gray-400">جاري التحقق من الصلاحيات...</div>;
  }


  // 4. دالة تسديد الدين وتحديث قاعدة البيانات
  const exportToExcel = () => {
    // 1. الحصول على البيانات المفلترة حالياً
    const filteredData = allDebts.filter(d => {
      const search = searchTerm.toLowerCase();
      const mGrade = !selectedGrade || d.grade === selectedGrade;
      const mCourse = !selectedCourse || d.courseName === selectedCourse;
      const mInstructor = !selectedInstructor || d.instructor === selectedInstructor;
      return d.studentName?.toLowerCase().includes(search) && mGrade && mCourse && mInstructor;
    });

    if (filteredData.length === 0) return alert("لا توجد بيانات لتصديرها!");

    // 2. تنسيق البيانات لتناسب ملف الإكسل
    const excelRows = filteredData.map(d => ({
      "اسم الطالب": d.studentName,
      "الصف الدراسي": d.grade,
      "المادة": d.courseName,
      "المدرس": d.instructor,
      "المبلغ المتبقي": d.amount,
      "تاريخ الحصة": new Date(d.date).toLocaleDateString('ar-EG'),
      "رقم ولي الأمر": d.studentPhone
    }));

    // 3. إنشاء ملف الإكسل وتحميله
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المديونيات");
    
    // تحميل الملف باسم يحتوي على التاريخ الحالي
    XLSX.writeFile(workbook, `مديونيات_الطلاب_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // دالة تسديد الدين
  const handleSettleDebt = async (debt) => {
    if (!centerId) {
      alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    
    if (!confirm(`هل استلمت مبلغ ${debt.amount.toFixed(2)} ج من ${debt.studentName}؟`)) return;
    const session = sessions.find(s => s.id === debt.sessionId);
    const updatedPayments = { ...session.payments, [debt.studentUid]: (parseFloat(session.payments[debt.studentUid] || 0) + debt.amount).toFixed(2) };
    const { error } = await supabaseBrowser.from('sessions').update({ payments: updatedPayments }).eq('id', debt.sessionId).eq('center_id', centerId);
    if (!error) {
      setSessions(prev => prev.map(s => s.id === debt.sessionId ? { ...s, payments: updatedPayments } : s));
      alert("تم التسديد بنجاح ✅");
    }
  }; // <--- قفلة دالة التسديد

  // دالة المطالبة الجماعية (مستقلة)
  const handleMassDebtAlert = () => {
    filtered.forEach((d, i) => {
  setTimeout(() => {
    let p = d.studentPhone?.replace(/\D/g, '');
    if (p.startsWith('01')) p = '2' + p;

    // استخدام القالب الديناميكي هنا أيضاً
    let template = centerConfig?.msg_debt || "تذكير مالي: الطالب [name] متبقي عليه [amount] ج.م من حصة [topic]";
    const finalMsg = template
      .replace(/\[name\]/g, d.studentName)
      .replace(/\[amount\]/g, d.amount.toFixed(2))
      .replace(/\[topic\]/g, d.courseName);

    window.open(`https://wa.me/${p}?text=${encodeURIComponent(finalMsg)}`, '_blank');
  }, i * 1300);
  });
  };

  // دالة المسح السريع (Reset)
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setSelectedCourse('');
    setSelectedInstructor('');
    setSelectedStatus('');
  };


  // التحقق من وجود centerId قبل عرض المحتوى
  if (!centerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
          <p>جاري التحقق من صلاحيات الدخول...</p>
        </div>
      </div>
    );
  }

  // --- واجهة المستخدم الأساسية ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-right mb-20 md:mb-0" dir="rtl">
      {/* 1. رأس الصفحة (الهيدر) */}
      <div className="max-w-6xl mx-auto mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
          <Link href="/admin/sessions" className="bg-white p-2.5 rounded-full shadow hover:bg-gray-100 transition print:hidden shrink-0">
            <FaArrowRight className="text-gray-600" />
          </Link>
          <h1 className="text-xl md:text-3xl font-black text-red-700 flex items-center gap-2 md:gap-3 truncate">
            <FaExclamationTriangle className="shrink-0" /> <span className="truncate">سجل الدفعات المتأخرة</span>
          </h1>
        </div>
        <div className="bg-red-600 text-white px-6 py-3 md:py-2 rounded-2xl shadow-lg text-center w-full md:w-auto">
          <p className="text-[9px] md:text-[10px] opacity-80 uppercase font-bold tracking-wider">إجمالي المديونيات</p>
          {loading ? (
             <div className="h-8 w-24 bg-white/20 animate-pulse rounded mx-auto mt-1"></div>
          ) : (
            <p className="text-xl md:text-2xl font-black">{allDebts.reduce((s, d) => s + d.amount, 0).toFixed(2)} <span className="text-xs md:text-sm font-medium opacity-70">ج.م</span></p>
          )}
        </div>
      </div>

      {/* 2. شريط الفلاتر والأزرار الذكية */}
      <div className="max-w-6xl mx-auto mb-6 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 print:hidden text-right">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 items-end">
          
          {/* الفلاتر */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1 mr-1 uppercase">بحث بالاسم</label>
            <div className="relative">
              <FaSearch className="absolute top-3.5 right-3.5 text-gray-300" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="اسم الطالب..." className="w-full h-11 md:h-10 pr-10 pl-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1 mr-1 uppercase">تصفية بالصف</label>
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="w-full h-11 md:h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-white font-bold transition-all focus:border-red-500">
              <option value="">كل الصفوف</option>
              {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1 mr-1 uppercase">المادة</label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-full h-11 md:h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-white transition-all focus:border-red-500">
              <option value="">كل المواد</option>
              {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1 mr-1 uppercase">المدرس</label>
            <select value={selectedInstructor} onChange={e => setSelectedInstructor(e.target.value)} className="w-full h-11 md:h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-white font-medium transition-all focus:border-red-500">
              <option value="">كل المدرسين</option>
              {availableInstructors.map(i => <option key={i} value={i}>م/ {i}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1 mr-1 uppercase">حالة المديونية</label>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full h-11 md:h-10 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-white font-medium transition-all focus:border-red-500">
              <option value="">كل الحالات</option>
              <option value="monthly_expired">شهري (منتهي/لم يدفع) 📅</option>
              <option value="centerOnly">سنتر فقط 🏢</option>
              <option value="discount">بخصم خاص 📉</option>
              <option value="regular">عادي 👤</option>
            </select>
          </div>

          {/* قسم الأزرار المجمعة */}
          <div className="flex gap-2">
            <button 
              onClick={exportToExcel}
              className="flex-1 h-11 md:h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0"
              title="حفظ كملف إكسل"
            >
              <FaFileExcel className="text-sm shrink-0" /> إكسل
            </button>

            <button 
              onClick={() => {
                // 1. تحديد الديون المفلترة حالياً
                const filtered = allDebts.filter(d => {
                  const s = searchTerm.toLowerCase();
                  const mStatus = !selectedStatus || 
                    (selectedStatus === 'monthly_expired' ? (d.isMonthlyCourse && !d.isPaidMonthly) : d.status === selectedStatus);
                  
                  return d.studentName?.toLowerCase().includes(s) && 
                        (!selectedGrade || d.grade === selectedGrade) && 
                        (!selectedCourse || d.courseName === selectedCourse) && 
                        (!selectedInstructor || d.instructor === selectedInstructor) &&
                        mStatus;
                });

                if (filtered.length === 0) return alert("القائمة فارغة!");
                if (!confirm(`فتح ${filtered.length} محادثة واتساب للمطالبة؟`)) return;

                // 2. تشغيل المراسلة المتتابعة
                filtered.forEach((d, i) => {
                  setTimeout(() => {
                    let p = d.studentPhone?.replace(/\D/g, '');
                    if (p.startsWith('01')) p = '2' + p;

                    // استخدام القالب الديناميكي من الإعدادات
                    let template = centerConfig?.msg_debt || "تنبيه مالي: الطالب [name] متبقي عليه [amount] ج.م من حصة [topic]";
                    
                    const finalMsg = template
                      .replace(/\[name\]/g, d.studentName)
                      .replace(/\[amount\]/g, d.amount.toFixed(2))
                      .replace(/\[topic\]/g, d.courseName);

                    window.open(`https://wa.me/${p}?text=${encodeURIComponent(finalMsg)}`, '_blank');
                  }, i * 1300); // فاصل زمني لتجنب الحظر
                });
              }}
              className="flex-1 h-11 md:h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 shrink-0"
            >
              <FaWhatsapp className="text-sm shrink-0" /> <span className="truncate">واتساب مجمع</span>
            </button>

            {/* زر المسح الدائري */}
            {(searchTerm || selectedGrade || selectedCourse || selectedInstructor) && (
              <button 
                onClick={resetFilters}
                className="w-11 md:w-10 h-11 md:h-10 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl flex items-center justify-center transition shadow-sm border border-gray-200 shrink-0"
                title="مسح الفلاتر"
              >
                <FaUndo className="text-xs" />
              </button>
            )}
          </div>
        </div>
      </div>
          
      {/* 3. الجدول */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-100 divide-y divide-gray-100">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse min-w-[600px]">
            <thead className="bg-gray-900 text-white">
              <tr className="text-xs md:text-sm">
                <th className="p-4 md:p-5 whitespace-nowrap">الطالب</th>
                <th className="p-4 md:p-5 text-center whitespace-nowrap">الصف</th>
                <th className="p-4 md:p-5 text-center whitespace-nowrap">المادة</th>
                <th className="p-4 md:p-5 text-center font-bold whitespace-nowrap">المبلغ</th>
                <th className="p-4 whitespace-nowrap">تاريخ الحصة</th>
                <th className="p-4 md:p-5 text-center whitespace-nowrap">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-5"><div className="h-4 bg-gray-100 rounded w-2/3"></div></td>
                    <td className="p-5"><div className="h-4 bg-gray-100 rounded w-1/2 mx-auto"></div></td>
                    <td className="p-5"><div className="h-4 bg-gray-100 rounded w-1/2 mx-auto"></div></td>
                    <td className="p-5"><div className="h-6 bg-red-50 rounded w-1/3 mx-auto"></div></td>
                    <td className="p-5"><div className="h-4 bg-gray-100 rounded w-1/2 mx-auto"></div></td>
                    <td className="p-5"><div className="h-8 bg-gray-100 rounded w-1/2 mx-auto"></div></td>
                  </tr>
                ))
              ) : (
                allDebts
                  .filter(d => {
                    const search = searchTerm.toLowerCase();
                    const mSearch = d.studentName?.toLowerCase().includes(search);
                    const mGrade = !selectedGrade || d.grade === selectedGrade;
                    const mCourse = !selectedCourse || d.courseName === selectedCourse;
                    const mInstructor = !selectedInstructor || d.instructor === selectedInstructor;
                    const mStatus = !selectedStatus || 
                      (selectedStatus === 'monthly_expired' ? (d.isMonthlyCourse && !d.isPaidMonthly) : d.status === selectedStatus);
                    return mSearch && mGrade && mCourse && mInstructor && mStatus;
                  })
                  .map(debt => (
                    <tr key={debt.id} className="hover:bg-red-50/50 transition-colors">
                      <td className="p-4 md:p-5 font-bold text-gray-800 whitespace-nowrap">{debt.studentName}</td>
                      <td className="p-4 md:p-5 text-center">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black border border-blue-200 whitespace-nowrap">
                          {debt.grade}
                        </span>
                      </td>
                      <td className="p-4 md:p-5 text-center whitespace-nowrap">
                        <p className="font-bold text-xs md:text-sm">{debt.courseName}</p>
                        <div className="flex flex-col items-center gap-1 mt-1">
                          <p className="text-[9px] md:text-[10px] text-gray-400">م/ {debt.instructor}</p>
                          
                          {debt.isMonthlyCourse && !debt.isPaidMonthly && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[8px] font-bold rounded border border-red-100">شهري غير مدفوع 📅</span>
                          )}
                          {debt.status === 'centerOnly' && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded border border-blue-100">سنتر فقط 🏢</span>
                          )}
                          {debt.status === 'discount' && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-bold rounded border border-amber-100">خصم خاص 📉</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 md:p-5 text-center font-black text-red-600 text-lg md:text-xl whitespace-nowrap">{debt.amount.toFixed(2)}</td>
                      <td className="p-4 text-gray-500 font-mono text-xs md:text-sm whitespace-nowrap">
                        {new Date(debt.date).toLocaleDateString('ar-EG', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="p-4 md:p-5 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleSettleDebt(debt)} className="bg-green-600 hover:bg-green-700 text-white px-4 h-9 rounded-xl font-bold text-[10px] md:text-xs shadow transition active:scale-95 whitespace-nowrap">تسديد</button>
                          <button 
                            onClick={() => {
                              // 1. تنظيف وتجهيز رقم التليفون
                              let phone = debt.studentPhone.replace(/\D/g, ''); 
                              if (phone.startsWith('01')) phone = '2' + phone;

                              // 2. جلب القالب المخصص من الإعدادات أو استخدام قالب افتراضي
                              let template = centerConfig?.msg_debt || "تذكير مالي: الطالب [name] متبقي عليه مبلغ [amount] ج.م من حصة [topic]";

                              // 3. عملية الاستبدال الذكية للبيانات
                              const finalMsg = template
                                .replace(/\[name\]/g, debt.studentName)
                                .replace(/\[amount\]/g, debt.amount.toFixed(2))
                                .replace(/\[topic\]/g, debt.courseName);

                              // 4. فتح الرابط
                              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
                            }} 
                            className="bg-green-100 text-green-600 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-green-200 transition shadow-sm active:scale-95 shrink-0"
                            title="إرسال رسالة واتساب"
                          >
                            <FaWhatsapp className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        {allDebts.length === 0 && (
          <div className="p-20 text-center text-gray-400">
             <FaCheckCircle size={48} className="mx-auto mb-4 opacity-10" />
             <p className="font-bold">لا يوجد مديونيات متأخرة حالياً.</p>
          </div>
        )}
      </div>
    </div>
  );
}
