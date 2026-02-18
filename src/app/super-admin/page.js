'use client'; // Force recompile to fix Turbopack module factory error
import { useState, useEffect } from 'react';
import { supabaseBrowser } from '../../lib/supabase';
import { 
    FaBuilding, FaPowerOff, FaCheckCircle, FaSearch, 
    FaBoxOpen, FaPlus, FaTimes, FaCheck, FaEdit, FaCalendarAlt, FaSave, FaTrash, FaExchangeAlt
} from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

export default function SuperAdminDashboard() {
    const [activeTab, setActiveTab] = useState('centers');
    
    // 📦 حالات السناتر
    const [centers, setCenters] = useState([]);
    const [loadingCenters, setLoadingCenters] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // 📦 حالات الباقات والمميزات
    const [packages, setPackages] = useState([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [availableFeatures, setAvailableFeatures] = useState([]); 
    
    // 🆕 حالات مودال التجديد (غرفة العمليات المصغرة)
    const [editingCenter, setEditingCenter] = useState(null); // السنتر اللي بنعدله حالياً
    const [editForm, setEditForm] = useState({
        packageId: '',
        endDate: ''
    });

    // حالات فورم إضافة الباقة
    const [showPkgForm, setShowPkgForm] = useState(false);
    const [editingPackageId, setEditingPackageId] = useState(null); // ID الباقة قيد التعديل
    const [migrationData, setMigrationData] = useState(null); // 🆕 بيانات النقل والحذف { pkg, count }
    const [targetPackageId, setTargetPackageId] = useState(''); // الباقة البديلة

    const [pkgForm, setPkgForm] = useState({
        name: '',
        price: '',
        duration_days: 180,
        max_students: '',
        features: [] 
    });

    // ==========================================
    // 1️⃣ دوال السناتر (محدثة)
    // ==========================================
    const fetchCenters = async () => {
        setLoadingCenters(true);
        try {
            const { data, error } = await supabaseBrowser
                .from('centers')
                .select('id, name, created_at, is_active, subscription_end_date, package_id, packages ( id, name, price )')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCenters(data || []);
        } catch (error) { toast.error('❌ خطأ في جلب السناتر: ' + error.message); } 
        finally { setLoadingCenters(false); }
    };

    const toggleCenterStatus = async (centerId, currentStatus) => {
        if (!window.confirm(currentStatus ? 'هل أنت متأكد من إيقاف هذا المركز؟' : 'هل أنت متأكد من تفعيل هذا المركز؟')) return;
        try {
            const { error } = await supabaseBrowser.from('centers').update({ is_active: !currentStatus }).eq('id', centerId);
            if (error) throw error;
            toast.success(currentStatus ? '⛔ تم الإيقاف' : '✅ تم التفعيل');
            setCenters(centers.map(c => c.id === centerId ? { ...c, is_active: !currentStatus } : c));
        } catch (error) { toast.error(error.message); }
    };

    // 🆕 فتح مودال التجديد
    const openEditModal = (center) => {
        // تحويل التاريخ لصيغة يفهمها حقل الإدخال (YYYY-MM-DD)
        let formattedDate = '';
        if (center.subscription_end_date) {
            const date = new Date(center.subscription_end_date);
            formattedDate = date.toISOString().split('T')[0];
        }

        setEditForm({
            packageId: center.package_id || '', // الباقة الحالية
            endDate: formattedDate // تاريخ الانتهاء الحالي
        });
        setEditingCenter(center);
    };

    // 🆕 تنفيذ التجديد وحفظ البيانات
    const handleUpdateSubscription = async (e) => {
        e.preventDefault();
        if (!editingCenter) return;

        try {
            const { error } = await supabaseBrowser
                .from('centers')
                .update({
                    package_id: editForm.packageId,
                    subscription_end_date: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
                    is_active: true // نفعله بالمرة لو كان واقف
                })
                .eq('id', editingCenter.id);

            if (error) throw error;

            toast.success('🎉 تم تحديث الاشتراك وتجديد الباقة بنجاح!');
            
            // تحديث الواجهة فوراً
            setCenters(centers.map(c => {
                if (c.id === editingCenter.id) {
                    // بنجيب اسم الباقة الجديدة عشان نعرضه صح في الجدول
                    const newPkg = packages.find(p => p.id === editForm.packageId);
                    return {
                        ...c,
                        package_id: editForm.packageId,
                        subscription_end_date: editForm.endDate,
                        is_active: true,
                        packages: newPkg ? { name: newPkg.name, price: newPkg.price } : c.packages
                    };
                }
                return c;
            }));

            setEditingCenter(null); // قفل المودال
        } catch (error) {
            toast.error('❌ خطأ في التحديث: ' + error.message);
        }
    };

    // ==========================================
    // 2️⃣ دوال الباقات والمميزات
    // ==========================================
    const fetchFeatures = async () => {
        try {
            const { data, error } = await supabaseBrowser.from('features').select('*');
            if (error) throw error;
            setAvailableFeatures(data || []);
        } catch (error) { console.error('Error fetching features:', error); }
    };

    const seedNewFeatures = async () => {
        const newFeatures = [
            { id: 'page_exams', name: 'الاختبارات والنتائج', description: 'الوصول لصفحة رصد الدرجات وإدارة الامتحانات' },
            { id: 'page_subscriptions', name: 'إدارة الاشتراكات الشهرية', description: 'الوصول لصفحة تحصيل ومتابعة الاشتراكات الشهرية' },
            { id: 'page_staff_permissions', name: 'نظام أذونات الوصول', description: 'التحكم في وصول الموظفين للصفحات والعمليات' },
            { id: 'action_add_exam', name: 'إضافة اختبارات', description: 'صلاحية إنشاء اختبار جديد' },
            { id: 'action_publish_results', name: 'نشر النتائج', description: 'صلاحية نشر النتائج للطلاب وإرسال واتساب' },
            { id: 'action_edit_exam', name: 'تعديل الاختبارات', description: 'صلاحية تعديل بيانات الاختبار' },
            { id: 'action_delete_exam', name: 'حذف الاختبارات', description: 'صلاحية حذف سجلات الاختبارات' }
        ];

        try {
            const { error } = await supabaseBrowser.from('features').upsert(newFeatures);
            if (error) throw error;
            toast.success('✅ تم تحديث قائمة المميزات بنجاح!');
            fetchFeatures();
        } catch (error) {
            toast.error('❌ فشل التحديث: ' + error.message);
        }
    };

    const fetchPackages = async () => {
        setLoadingPackages(true);
        try {
            const { data, error } = await supabaseBrowser
                .from('packages')
                .select(`*, package_features ( feature_id )`)
                .order('price', { ascending: true });

            if (error) throw error;
            setPackages(data || []);
        } catch (error) { toast.error('❌ خطأ في جلب الباقات: ' + error.message); } 
        finally { setLoadingPackages(false); }
    };

    const handleFeatureToggle = (featureId) => {
        setPkgForm(prev => {
            const isSelected = prev.features.includes(featureId);
            return {
                ...prev,
                features: isSelected 
                    ? prev.features.filter(id => id !== featureId) 
                    : [...prev.features, featureId] 
            };
        });
    };

    const handleSavePackage = async (e) => {
        e.preventDefault();
        try {
            let pkgId = editingPackageId;

            if (editingPackageId) {
                // 🔄 تحديث الباقة الموجودة
                const { error } = await supabaseBrowser
                    .from('packages')
                    .update({
                        name: pkgForm.name,
                        price: Number(pkgForm.price),
                        duration_days: Number(pkgForm.duration_days),
                        max_students: pkgForm.max_students ? Number(pkgForm.max_students) : null
                    })
                    .eq('id', editingPackageId);
                
                if (error) throw error;
                
                // تحديث المميزات: نحذف القديم ونضيف الجديد
                await supabaseBrowser.from('package_features').delete().eq('package_id', editingPackageId);
                toast.success('✅ تم تحديث الباقة بنجاح!');
            } else {
                // 🆕 إنشاء باقة جديدة
                const { data, error } = await supabaseBrowser
                    .from('packages')
                    .insert([{
                        name: pkgForm.name,
                        price: Number(pkgForm.price),
                        duration_days: Number(pkgForm.duration_days),
                        max_students: pkgForm.max_students ? Number(pkgForm.max_students) : null,
                        is_active: true
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                pkgId = data.id;
                toast.success('🎉 تم إنشاء الباقة بنجاح!');
            }

            // إضافة المميزات
            if (pkgForm.features.length > 0) {
                const featureInserts = pkgForm.features.map(fId => ({
                    package_id: pkgId,
                    feature_id: fId
                }));
                await supabaseBrowser.from('package_features').insert(featureInserts);
            }
            
            fetchPackages();
            resetPkgForm();
        } catch (error) { toast.error('❌ خطأ: ' + error.message); }
    };

    // دالة تنفيذ الحذف والنقل
    const handleMigrateAndDelete = async (e) => {
        e.preventDefault();
        if (!targetPackageId) return toast.error('يرجى اختيار باقة بديلة');
        
        try {
            // 1. نقل المراكز
            const { error: updateError } = await supabaseBrowser
                .from('centers')
                .update({ package_id: targetPackageId })
                .eq('package_id', migrationData.pkg.id);
            
            if (updateError) throw updateError;

            // 2. حذف الباقة القديمة
            const { error: deleteError } = await supabaseBrowser
                .from('packages')
                .delete()
                .eq('id', migrationData.pkg.id);

            if (deleteError) throw deleteError;

            toast.success('🎉 تم نقل المراكز وحذف الباقة بنجاح!');
            setMigrationData(null);
            setTargetPackageId('');
            
            // تحديث البيانات
            fetchPackages();
            fetchCenters();
        } catch (error) {
            toast.error('❌ فشلت العملية: ' + error.message);
        }
    };

    const handleDeletePackage = async (pkgId) => {
        // بنحتاج نجيب تفاصيل الباقة عشان نعرضها في المودال
        const pkgToDelete = packages.find(p => p.id === pkgId);
        if (!pkgToDelete) return;

        if (!confirm(`هل أنت متأكد من رغبتك في حذف باقة "${pkgToDelete.name}"؟`)) return;
        
        try {
            // 🛑 أولاً: التحقق من الاستخدام
            const { count, error: countError } = await supabaseBrowser
                .from('centers')
                .select('*', { count: 'exact', head: true })
                .eq('package_id', pkgId);

            if (countError) throw countError;

            if (count > 0) {
                // 💡 هنا بنفتح مودال النقل بدل رسالة الخطأ
                setMigrationData({ pkg: pkgToDelete, count });
                return;
            }

            // ✅ الحذف المباشر لو مفيش مراكز
            const { error } = await supabaseBrowser.from('packages').delete().eq('id', pkgId);
            if (error) throw error;
            
            toast.success('🗑️ تم حذف الباقة');
            setPackages(prev => prev.filter(p => p.id !== pkgId));
        } catch (error) { toast.error('❌ تعذر الحذف: ' + error.message); }
    };

    const handleEditPackage = (pkg) => {
        setEditingPackageId(pkg.id);
        setPkgForm({
            name: pkg.name,
            price: pkg.price,
            duration_days: pkg.duration_days,
            max_students: pkg.max_students || '',
            features: pkg.package_features?.map(pf => pf.feature_id) || []
        });
        setShowPkgForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetPkgForm = () => {
        setShowPkgForm(false);
        setEditingPackageId(null);
        setPkgForm({ name: '', price: '', duration_days: 180, max_students: '', features: [] });
    };

    const togglePackageStatus = async (pkgId, currentStatus) => {
        try {
            const { error } = await supabaseBrowser.from('packages').update({ is_active: !currentStatus }).eq('id', pkgId);
            if (error) throw error;
            toast.success(currentStatus ? 'تم إخفاء الباقة' : 'تم تفعيل الباقة');
            setPackages(packages.map(p => p.id === pkgId ? { ...p, is_active: !currentStatus } : p));
        } catch (error) { toast.error(error.message); }
    };

    // ==========================================
    // التحميل الأولي
    // ==========================================
    useEffect(() => {
        // بنحمل كل حاجة مرة واحدة عشان المودال يشتغل صح
        fetchCenters();
        fetchPackages();
        fetchFeatures();
    }, []);

    const filteredCenters = centers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800" dir="rtl">
            <Toaster position="top-center" />
            
            <div className="bg-slate-900 text-white p-6 shadow-xl sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <h1 className="text-2xl font-black flex items-center gap-3">
                        <span className="text-blue-400">⚡ Super</span> Admin
                    </h1>
                    <div className="flex bg-slate-800 rounded-xl p-1">
                        <button onClick={() => setActiveTab('centers')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'centers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>السناتر المشتركة</button>
                        <button onClick={() => setActiveTab('packages')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'packages' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>إدارة الباقات</button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 mt-6">
                
                {/* ---------------- تابة السناتر ---------------- */}
                {activeTab === 'centers' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <FaBuilding className="text-blue-600" /> إحصائيات السناتر ({centers.length})
                            </h2>
                            <div className="relative w-full md:w-96">
                                <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="ابحث باسم السنتر..." className="w-full pl-4 pr-12 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:border-blue-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-4">اسم السنتر</th>
                                        <th className="px-6 py-4">الباقة الحالية</th>
                                        <th className="px-6 py-4">تاريخ الانتهاء</th>
                                        <th className="px-6 py-4">الحالة</th>
                                        <th className="px-6 py-4 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loadingCenters ? (
                                        <tr><td colSpan="5" className="text-center py-10 text-slate-400 font-bold">جاري تحميل البيانات... ⏳</td></tr>
                                    ) : filteredCenters.map(center => {
                                        const isExpired = new Date(center.subscription_end_date) < new Date();
                                        return (
                                            <tr key={center.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-black text-slate-800">{center.name}</td>
                                                <td className="px-6 py-4 font-bold text-blue-600">{center.packages?.name || 'بدون باقة'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-mono text-xs px-2 py-1 rounded-lg ${isExpired ? 'bg-red-100 text-red-600 font-black' : 'bg-slate-100 text-slate-600'}`}>
                                                        {center.subscription_end_date ? new Date(center.subscription_end_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`flex items-center gap-1 text-xs font-black w-fit px-2 py-1 rounded-full ${center.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {center.is_active ? <><FaCheckCircle/> نشط</> : <><FaPowerOff/> موقوف</>}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                                    {/* زر التجديد الجديد */}
                                                    <button 
                                                        onClick={() => openEditModal(center)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-black bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1"
                                                        title="تعديل الباقة أو التجديد"
                                                    >
                                                        <FaEdit /> تجديد
                                                    </button>

                                                    <button 
                                                        onClick={() => toggleCenterStatus(center.id, center.is_active)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${center.is_active ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'}`}
                                                    >
                                                        {center.is_active ? 'إيقاف' : 'تفعيل'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ---------------- تابة الباقات (نفس الكود السابق) ---------------- */}
                {activeTab === 'packages' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <FaBoxOpen className="text-blue-600" /> الباقات المتاحة للبيع
                            </h2>
                            <div className="flex gap-3">
                                <button 
                                    onClick={seedNewFeatures}
                                    className="bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-50 transition-all flex items-center gap-2"
                                >
                                    <FaExchangeAlt /> تحديث قائمة المميزات
                                </button>
                                <button 
                                    onClick={() => showPkgForm ? resetPkgForm() : setShowPkgForm(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                                >
                                    {showPkgForm ? <><FaTimes/> إلغاء</> : <><FaPlus/> إضافة باقة جديدة</>}
                                </button>
                            </div>
                        </div>

                        {showPkgForm && (
                            <form onSubmit={handleSavePackage} className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 animate-in slide-in-from-top-4">
                                <h3 className="text-lg font-black text-slate-700 mb-4 flex items-center gap-2">
                                    {editingPackageId ? <FaEdit className="text-yellow-500"/> : <FaPlus className="text-blue-500"/>}
                                    {editingPackageId ? 'تعديل بيانات الباقة' : 'باقة جديدة'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-2">اسم الباقة</label>
                                        <input type="text" required value={pkgForm.name} onChange={e => setPkgForm({...pkgForm, name: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" placeholder="مثال: الباقة الأساسية" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-2">السعر (جنيه)</label>
                                        <input type="number" required min="0" value={pkgForm.price} onChange={e => setPkgForm({...pkgForm, price: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" placeholder="مثال: 5000" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-2">المدة (بالأيام)</label>
                                        <input type="number" required min="1" value={pkgForm.duration_days} onChange={e => setPkgForm({...pkgForm, duration_days: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" placeholder="مثال: 180" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-2">سعة الطلاب</label>
                                        <input type="number" min="1" value={pkgForm.max_students} onChange={e => setPkgForm({...pkgForm, max_students: e.target.value})} className="w-full p-3 border rounded-xl outline-none focus:border-blue-500" placeholder="مفتوح لو فارغ" />
                                    </div>
                                </div>

                                <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <label className="text-sm font-black text-slate-700 block mb-3">الصلاحيات والمميزات المرفقة:</label>
                                    {/* 🚨 7. قسم اختيار الصفحات والمميزات (مقسم ومترتب) */}
{/* 🚨 7. قسم اختيار الصفحات والمميزات (مقسم ومترتب بشكل ذكي) */}
<div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-96 overflow-y-auto custom-scrollbar">
    
    {/* 🟢 القسم الأول: صفحات النظام (التحكم في القائمة الجانبية) */}
    <div className="mb-6">
        <h4 className="text-xs font-black text-blue-600 mb-3 flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100">
            <FaCheckCircle /> صفحات النظام (Sidebar Access)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {availableFeatures
                .filter(f => f.id.startsWith('page_')) // هنا بنجيب الصفحات بس
                .map(feature => {
                const isChecked = pkgForm.features.includes(feature.id);
                return (
                    <div 
                        key={feature.id} 
                        onClick={() => handleFeatureToggle(feature.id)}
                        className={`cursor-pointer p-2 rounded-lg border flex items-center gap-2 transition-all ${isChecked ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                    >
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-600 text-white' : 'border-2 border-slate-300'}`}>
                            {isChecked && <FaCheck size={10} />}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[11px] font-black ${isChecked ? 'text-blue-900' : 'text-slate-600'}`}>{feature.name}</span>
                            <span className="text-[9px] text-slate-400 truncate w-32">{feature.description || 'وصول للصفحة'}</span>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>

    <hr className="border-slate-200 my-4" />

    {/* 🟠 القسم الثاني: التحكم في الزراير (Actions & Security) */}
    <div className="mb-4">
        <h4 className="text-xs font-black text-orange-600 mb-3 flex items-center gap-2 bg-orange-50 p-2 rounded-lg border border-orange-100">
            <FaPowerOff /> التحكم في الزراير (Action Gating)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2">
            {availableFeatures
                .filter(f => f.id.startsWith('action_')) // هنا بنجيب الزراير بس
                .map(feature => {
                const isChecked = pkgForm.features.includes(feature.id);
                return (
                    <div 
                        key={feature.id} 
                        onClick={() => handleFeatureToggle(feature.id)}
                        className={`cursor-pointer p-2 rounded-lg border flex items-center gap-2 transition-all ${isChecked ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-slate-200 bg-white hover:border-orange-300'}`}
                    >
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isChecked ? 'bg-orange-600 text-white' : 'border-2 border-slate-300'}`}>
                            {isChecked && <FaCheck size={10} />}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-[11px] font-black ${isChecked ? 'text-orange-900' : 'text-slate-600'}`}>{feature.name}</span>
                            <span className="text-[9px] text-slate-400">{feature.description || 'زرار تحكم'}</span>
                        </div>
                    </div>
                )
            })}
        </div>
    </div>

    {/* 🟣 القسم الثالث: إضافات أخرى (لو موجودة) */}
    {availableFeatures.some(f => !f.id.startsWith('page_') && !f.id.startsWith('action_')) && (
        <>
            <hr className="border-slate-200 my-4" />
            <div className="mb-4">
                <h4 className="text-xs font-black text-purple-600 mb-3 flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                    <FaBoxOpen /> مميزات عامة (Integrations)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {availableFeatures
                        .filter(f => !f.id.startsWith('page_') && !f.id.startsWith('action_')) // البواقي
                        .map(feature => {
                        const isChecked = pkgForm.features.includes(feature.id);
                        return (
                            <div 
                                key={feature.id} 
                                onClick={() => handleFeatureToggle(feature.id)}
                                className={`cursor-pointer p-2 rounded-lg border flex items-center gap-2 transition-all ${isChecked ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${isChecked ? 'bg-purple-600 text-white' : 'border-2 border-slate-300'}`}>
                                    {isChecked && <FaCheck size={10} />}
                                </div>
                                <span className={`text-[11px] font-black ${isChecked ? 'text-purple-900' : 'text-slate-600'}`}>{feature.name}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    )}
</div>
                                </div>
                                <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">
                                    {editingPackageId ? 'حفظ التعديلات ✅' : 'حفظ الباقة 🚀'}
                                </button>
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {packages.map(pkg => (
                                <div key={pkg.id} className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all ${pkg.is_active ? 'border-transparent hover:border-blue-500' : 'border-slate-200 opacity-60'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-black text-slate-800">{pkg.name}</h3>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{pkg.is_active ? 'متاحة للبيع' : 'مخفية'}</span>
                                    </div>
                                    <div className="text-3xl font-black text-blue-600 mb-6">{pkg.price} <span className="text-sm text-slate-400 font-bold">جنيه</span></div>
                                    <div className="space-y-3 text-sm font-bold text-slate-600 mb-6 border-b border-slate-100 pb-4">
                                        <p className="flex justify-between"><span>المدة:</span> <span>{pkg.duration_days} يوم</span></p>
                                        <p className="flex justify-between"><span>سعة الطلاب:</span> <span>{pkg.max_students ? `${pkg.max_students} طالب` : 'غير محدود 🚀'}</span></p>
                                    </div>
                                    <div className="mb-6">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">مميزات الباقة:</h4>
                                        <ul className="space-y-2">
                                            {pkg.package_features?.length > 0 ? (
                                                pkg.package_features.map((pf, idx) => {
                                                    const featureDetails = availableFeatures.find(f => f.id === pf.feature_id);
                                                    return (
                                                        <li key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                            <FaCheckCircle className="text-green-500 text-[10px]" />
                                                            {featureDetails ? featureDetails.name : pf.feature_id}
                                                        </li>
                                                    )
                                                })
                                            ) : <li className="text-xs text-slate-400 italic">باقة أساسية</li>}
                                        </ul>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => togglePackageStatus(pkg.id, pkg.is_active)} className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${pkg.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>{pkg.is_active ? 'إخفاء الباقة' : 'إعادة إتاحة الباقة'}</button>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleEditPackage(pkg)} 
                                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center justify-center gap-1"
                                            >
                                                <FaEdit /> تعديل
                                            </button>
                                            <button 
                                                onClick={() => handleDeletePackage(pkg.id)} 
                                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center gap-1"
                                            >
                                                <FaTrash /> حذف
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================== */}
            {/* 🆕 مودال تجديد الاشتراك (غرفة العمليات) */}
            {/* ========================================== */}
            {editingCenter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <FaCalendarAlt className="text-blue-600" /> تجديد الاشتراك
                            </h2>
                            <button onClick={() => setEditingCenter(null)} className="bg-slate-100 p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-all">
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="mb-6">
                            <h3 className="text-sm font-bold text-slate-500">المركز الحالي:</h3>
                            <p className="text-2xl font-black text-slate-900">{editingCenter.name}</p>
                        </div>

                        <form onSubmit={handleUpdateSubscription} className="space-y-6">
                            <div>
                                <label className="text-xs font-black text-slate-600 block mb-2">1. اختر الباقة الجديدة (ترقية/تغيير)</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500"
                                    value={editForm.packageId}
                                    onChange={e => setEditForm({...editForm, packageId: e.target.value})}
                                >
                                    <option value="">-- اختر الباقة --</option>
                                    {packages.map(pkg => (
                                        <option key={pkg.id} value={pkg.id}>
                                            {pkg.name} ({pkg.price} جنيه - {pkg.duration_days} يوم)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-600 block mb-2">2. تاريخ انتهاء الصلاحية (تعديل يدوي)</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500"
                                    value={editForm.endDate}
                                    onChange={e => setEditForm({...editForm, endDate: e.target.value})}
                                />
                                <p className="text-[10px] text-slate-400 mt-2 font-bold">
                                    💡 نصيحة: قم بزيادة التاريخ يدوياً بناءً على مدة التجديد المطلوبة.
                                </p>
                            </div>

                            <button 
                                type="submit" 
                                className="w-full bg-blue-600 text-white p-4 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-2"
                            >
                                <FaSave /> حفظ التجديد وتفعيل المركز
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================== */}
            {/* 🆕 مودال النقل والحذف (Migration Modal) */}
            {/* ========================================== */}
            {migrationData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-orange-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4 animate-bounce">
                                <FaExchangeAlt size={28} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">مطلوب إجراء! ⚠️</h2>
                            <p className="text-sm text-slate-500 mt-2 font-bold px-4">
                                لا يمكن حذف باقة <span className="text-blue-600 font-black">"{migrationData.pkg.name}"</span> مباشرة لأنها مستخدمة من قبل <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-lg">{migrationData.count} مركز</span>.
                            </p>
                            <p className="text-xs text-slate-400 mt-2">يرجى اختيار باقة بديلة لنقل المراكز إليها قبل الحذف.</p>
                        </div>

                        <form onSubmit={handleMigrateAndDelete} className="space-y-4">
                            <div className="text-right">
                                <label className="text-xs font-black text-slate-600 block mb-2">الباقة البديلة (الجديدة)</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-xl font-bold text-sm outline-none transition-colors"
                                    value={targetPackageId}
                                    onChange={e => setTargetPackageId(e.target.value)}
                                    required
                                >
                                    <option value="">-- اختر باقة لاستقبال المراكز --</option>
                                    {packages
                                        .filter(p => p.id !== migrationData.pkg.id) // استبعاد الباقة المراد حذفها
                                        .filter(p => p.is_active) // فقط الباقات النشطة
                                        .map(pkg => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.name} ({pkg.price}ج)
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="submit" 
                                    disabled={!targetPackageId}
                                    className="flex-1 bg-red-600 text-white p-3 rounded-xl font-black shadow-lg hover:bg-red-700 transition-all flex justify-center items-center gap-2 disabled:bg-gray-300 disabled:shadow-none"
                                >
                                    <FaTrash /> نقل وحذف
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => { setMigrationData(null); setTargetPackageId(''); }}
                                    className="flex-1 bg-gray-100 text-gray-600 p-3 rounded-xl font-black hover:bg-gray-200 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}