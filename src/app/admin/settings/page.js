'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase as supabaseBrowser } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import {
  FaSave, FaPalette, FaBuilding, FaImage, FaUpload, FaSync,
  FaWhatsapp, FaExclamationTriangle, FaPhoneAlt, FaCode, FaTrash,
  FaDoorOpen, FaMapMarkerAlt, FaLayerGroup, FaSortNumericDown, FaCrown,
  FaCalendarAlt, FaMoneyBillWave, FaPaintBrush, FaFileAlt, FaCommentDots,
  FaUserGraduate, FaPlus, FaTimes
} from 'react-icons/fa';

import AccessDenied from '../../../components/AccessDenied';

// ══════════════════════════════════════════════════════════════
// SettingsPage — Fully Responsive Premium UI
// ══════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const router = useRouter();
  const { centerId: center_id, loading: authLoading, user, allowedFeatures } = useAuth();

  // 🛡️ Package Guard
  if (!authLoading && allowedFeatures && !allowedFeatures.includes('page_settings')) {
    return <AccessDenied />;
  }

  // ── Core Settings State ──
  const [settings, setSettings] = useState({
    center_name: '',
    primary_color: '#2563eb',
    report_footer: '',
    address: '',
    whatsapp_template: '',
    msg_debt: '',
    msg_absent: '',
    logo_url: '',
    student_code_prefix: 'S',
    debt_limit: 300,
    center_phone: '',
    next_student_code: 100000,
    // Subscription info (read-only from centers table)
    package_name: '',
    end_date: ''
  });

  // 🎭 Identity Mode State
  const [centerType, setCenterType] = useState('center'); // 'center' | 'instructor'
  const [instructorFields, setInstructorFields] = useState({
    instructor_name: '',
    instructor_photo_url: '',
    instructor_bio: '',
    instructor_title: '',
    instructor_subject: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Rooms & Stages State ──
  const [rooms, setRooms] = useState([]);
  const [stages, setStages] = useState([]);

  // ── Add Stage inputs ──
  const [newStage, setNewStage] = useState('');
  const [sortOrder, setSortOrder] = useState(1);

  // ✅ FIX: Controlled states for Room inputs
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');

  // ── UI State ──
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [creatingProfile, setCreatingProfile] = useState(false);

  // ══════════════════════════════════════════════════════
  // Data Loading
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    async function loadData() {
      if (authLoading) return;
      if (!center_id) {
        setDataLoading(false);
        return;
      }

      try {
        const { data: settingsData } = await supabaseBrowser
          .from('center_settings')
          .select('*')
          .eq('center_id', center_id)
          .maybeSingle();

        const { data: centerData } = await supabaseBrowser
          .from('centers')
          .select(`subscription_end_date, packages ( name )`)
          .eq('id', center_id)
          .single();

        if (settingsData) {
          setSettings({
            center_name: settingsData.center_name || '',
            primary_color: settingsData.primary_color || '#2563eb',
            address: settingsData.address || '',
            whatsapp_template: settingsData.whatsapp_template || '',
            msg_debt: settingsData.msg_debt || '',
            msg_absent: settingsData.msg_absent || '',
            report_footer: settingsData.report_footer || '',
            debt_limit: settingsData.debt_limit || 300,
            center_phone: settingsData.center_phone || '',
            logo_url: settingsData.logo_url || '',
            next_student_code: settingsData.next_student_code || 100000,
            student_code_prefix: settingsData.student_code_prefix || 'S',
            package_name: centerData?.packages?.name || 'غير محدد',
            end_date: centerData?.subscription_end_date || ''
          });
          // 🎭 Identity Mode
          setInstructorFields({
            instructor_name: settingsData.instructor_name || '',
            instructor_photo_url: settingsData.instructor_photo_url || '',
            instructor_bio: settingsData.instructor_bio || '',
            instructor_title: settingsData.instructor_title || '',
            instructor_subject: settingsData.instructor_subject || '',
          });
        } else {
          setSettings(prev => ({
            ...prev,
            package_name: centerData?.packages?.name || 'غير محدد',
            end_date: centerData?.subscription_end_date || ''
          }));
        }

        // 🎭 جلب center_type من centers
        const { data: centerTypeData } = await supabaseBrowser
          .from('centers')
          .select('center_type')
          .eq('id', center_id)
          .single();
        if (centerTypeData?.center_type) setCenterType(centerTypeData.center_type);

        const { data: roomsData } = await supabaseBrowser
          .from('rooms')
          .select('*')
          .eq('center_id', center_id)
          .order('created_at', { ascending: true });
        if (roomsData) setRooms(roomsData);

        const { data: stagesData } = await supabaseBrowser
          .from('educational_stages')
          .select('*')
          .eq('center_id', center_id)
          .order('sort_order', { ascending: true });

        if (stagesData) {
          setStages(stagesData);
          if (stagesData.length > 0) {
            setSortOrder(stagesData[stagesData.length - 1].sort_order + 1);
          }
        }
      } catch (error) {
        console.error('Error loading settings data:', error);
      } finally {
        setDataLoading(false);
      }
    }

    if (!authLoading && center_id) {
      loadData();
    } else if (!authLoading && !center_id) {
      setDataLoading(false);
    }
  }, [center_id, authLoading]);

  // ══════════════════════════════════════════════════════
  // Save Settings
  // ══════════════════════════════════════════════════════
  const handleSave = async () => {
    if (!center_id) return alert('خطأ: لم يتم التعرف على السنتر!');

    setSaving(true);
    // حفظ center_settings
    const { error } = await supabaseBrowser
      .from('center_settings')
      .upsert({
        center_id: center_id,
        center_name: settings.center_name,
        address: settings.address,
        center_phone: settings.center_phone,
        primary_color: settings.primary_color,
        report_footer: settings.report_footer,
        logo_url: settings.logo_url,
        debt_limit: settings.debt_limit,
        whatsapp_template: settings.whatsapp_template,
        msg_debt: settings.msg_debt,
        msg_absent: settings.msg_absent,
        next_student_code: settings.next_student_code,
        student_code_prefix: settings.student_code_prefix,
        // 🎭 Instructor Mode fields
        ...instructorFields,
      }, { onConflict: 'center_id' });

    // حفظ center_type في centers
    await supabaseBrowser
      .from('centers')
      .update({ center_type: centerType })
      .eq('id', center_id);

    if (error) {
      alert('حدث خطأ أثناء الحفظ: ' + error.message);
    } else {
      alert('✅ تم حفظ إعدادات السنتر بنجاح!');
      window.location.reload();
    }
    setSaving(false);
  };

  // ══════════════════════════════════════════════════════
  // Logo Upload
  // ══════════════════════════════════════════════════════
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${center_id}-logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseBrowser.storage
        .from('center-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseBrowser.storage
        .from('center-logos')
        .getPublicUrl(fileName);

      setSettings({ ...settings, logo_url: publicUrl });
      alert("تم رفع اللوجو! اضغط 'حفظ الإعدادات' لتثبيته.");
    } catch (error) {
      alert('فشل الرفع: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 👨‍🏫 Instructor Photo Upload
  const handleInstructorPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${center_id}-instructor-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabaseBrowser.storage
        .from('center-logos')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabaseBrowser.storage
        .from('center-logos')
        .getPublicUrl(fileName);
      setInstructorFields(prev => ({ ...prev, instructor_photo_url: publicUrl }));
      alert("تم رفع الصورة! اضغط 'حفظ الإعدادات' لتثبيتها.");
    } catch (error) {
      alert('فشل الرفع: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ══════════════════════════════════════════════════════
  // Rooms
  // ══════════════════════════════════════════════════════
  const handleAddRoom = async () => {
    if (authLoading) return alert('⏳ جاري تحميل بيانات السنتر، يرجى الانتظار...');
    if (!center_id) {
      return alert('⚠️ خطأ: لم يتم التعرف على السنتر!\n\nيرجى:\n1. التأكد من أن حسابك مرتبط بسنتر\n2. تحديث الصفحة\n3. إعادة تسجيل الدخول');
    }

    const name = newRoomName.trim();
    if (!name) return alert('يرجى إدخال اسم القاعة');

    setSaving(true);
    try {
      const { data, error } = await supabaseBrowser
        .from('rooms')
        .insert([{
          name,
          capacity: parseInt(newRoomCapacity) || 0,
          center_id: center_id
        }])
        .select();

      if (error) throw error;

      setRooms([...rooms, ...data]);
      setNewRoomName('');
      setNewRoomCapacity('');
      alert('✅ تمت إضافة القاعة بنجاح');
    } catch (error) {
      alert('حدث خطأ أثناء الإضافة: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه القاعة؟')) return;
    const { error } = await supabaseBrowser.from('rooms').delete().eq('id', id);
    if (!error) {
      setRooms(rooms.filter(r => r.id !== id));
    } else {
      alert(error.message);
    }
  };

  // ══════════════════════════════════════════════════════
  // Educational Stages
  // ══════════════════════════════════════════════════════
  const handleAddStage = async () => {
    if (authLoading) return alert('⏳ جاري تحميل بيانات السنتر، يرجى الانتظار...');
    if (!center_id) {
      return alert('⚠️ خطأ: لم يتم التعرف على السنتر!\n\nيرجى:\n1. التأكد من أن حسابك مرتبط بسنتر\n2. تحديث الصفحة\n3. إعادة تسجيل الدخول');
    }

    if (!newStage.trim()) return alert('اكتب اسم المرحلة');

    setSaving(true);
    try {
      const { data, error } = await supabaseBrowser
        .from('educational_stages')
        .insert([{
          name: newStage,
          sort_order: sortOrder,
          center_id: center_id
        }])
        .select();

      if (error) throw error;

      const updatedStages = [...stages, ...data].sort((a, b) => a.sort_order - b.sort_order);
      setStages(updatedStages);
      setNewStage('');
      setSortOrder(sortOrder + 1);
      alert('✅ تمت إضافة المرحلة بنجاح');
    } catch (error) {
      alert('حدث خطأ أثناء الإضافة: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStage = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return;
    const { error } = await supabaseBrowser.from('educational_stages').delete().eq('id', id);
    if (!error) {
      setStages(stages.filter(s => s.id !== id));
    } else {
      alert(error.message);
    }
  };

  const handleCreateProfile = async () => {
    if (!user) return;
    setCreatingProfile(true);
    try {
      const { data: centers, error: centersError } = await supabaseBrowser
        .from('centers')
        .select('id, name')
        .limit(1)
        .order('created_at', { ascending: true });

      if (centersError) throw centersError;

      let targetCenterId = null;
      if (centers && centers.length > 0) {
        targetCenterId = centers[0].id;
      } else {
        targetCenterId = '00000000-0000-0000-0000-000000000001';
      }

      const { error: profileError } = await supabaseBrowser
        .from('staff_profiles')
        .upsert({
          id: user.id,
          center_id: targetCenterId,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم',
          role: 'admin'
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      alert('✅ تم إنشاء الملف الشخصي بنجاح! سيتم تحديث الصفحة...');
      window.location.reload();
    } catch (error) {
      alert('❌ حدث خطأ: ' + error.message);
    } finally {
      setCreatingProfile(false);
    }
  };

  const isGuestMode = !user;
  const subscriptionDaysLeft = settings.end_date
    ? Math.max(0, Math.ceil((new Date(settings.end_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  const isExpired = subscriptionDaysLeft !== null && subscriptionDaysLeft <= 0;

  if (authLoading || (center_id && dataLoading)) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4 px-4">
        <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse text-sm md:text-base">جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  if (!authLoading && !center_id) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto" dir="rtl">
        <div className="bg-red-50 border-2 border-red-200 rounded-[2rem] p-6 md:p-10 text-center shadow-xl">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaExclamationTriangle className="text-red-500 text-2xl md:text-3xl" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-red-700 mb-2">لم يتم التعرف على السنتر</h2>
          <p className="text-sm md:text-base text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            حسابك غير مرتبط بسنتر حالياً. يرجى إنشاء سنتر جديد لبدء العمل أو التواصل مع الإدارة لربط حسابك بسنتر موجود.
          </p>
          
          <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
            <button
              onClick={() => router.push('/create-center')}
              className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-100 active:scale-95"
            >
              <FaBuilding /> إنشاء سنتر جديد
            </button>
            <button
              onClick={handleCreateProfile}
              disabled={creatingProfile}
              className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-emerald-100 active:scale-95"
            >
              {creatingProfile ? (
                <FaSync className="animate-spin" />
              ) : (
                <FaLayerGroup />
              )}
              {creatingProfile ? 'جاري الإنشاء...' : 'ربط حسابي بسنتر موجود'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-100 text-gray-600 px-6 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 p-2 md:p-0 pb-20 md:pb-10" dir="rtl">

      {/* ── Guest Mode Warning ── */}
      {isGuestMode && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-[1.5rem] flex items-center gap-3 mx-2 md:mx-0">
          <FaExclamationTriangle className="text-amber-600 text-xl flex-shrink-0" />
          <span className="text-xs md:text-sm text-amber-800 font-black">
            جلسة المستخدم غير مستقرة حالياً، لكن تم تحميل بيانات السنتر بنجاح.
          </span>
        </div>
      )}

      {/* 📊 SUBSCRIPTION INFO */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden mx-2 md:mx-0">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 opacity-5 rounded-full -translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-500 opacity-5 rounded-full translate-x-10 translate-y-10"></div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-4 md:p-5 rounded-2xl shadow-xl transform hover:rotate-6 transition-transform">
              <FaCrown className="text-white text-2xl md:text-4xl" />
            </div>
            <div>
              <h3 className="text-[10px] md:text-xs font-black text-slate-400 mb-1 uppercase tracking-widest">باقة الاشتراك الحالية</h3>
              <p className="text-2xl md:text-4xl font-black tracking-tight">{settings.package_name || 'غير محدد'}</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 w-full lg:w-auto lg:min-w-[340px] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] md:text-xs font-black text-slate-300 flex items-center gap-2">
                <FaCalendarAlt className="text-blue-400" /> موعد التجديد القادم
              </span>
              <span className="text-[10px] md:text-xs font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                {settings.end_date ? new Date(settings.end_date).toLocaleDateString('ar-EG') : 'غير محدد'}
              </span>
            </div>
            
            <div className="w-full bg-slate-700/50 h-3 rounded-full overflow-hidden border border-white/5 p-[2px]">
              <div
                className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.4)] ${isExpired ? 'bg-red-500' : subscriptionDaysLeft < 30 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${subscriptionDaysLeft !== null ? Math.min(100, (subscriptionDaysLeft / 365) * 100) : 0}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center mt-3">
              <p className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                الحالة:{' '}
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${isExpired ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {isExpired ? 'منتهي الصلاحية' : 'نشط'}
                </span>
              </p>
              {subscriptionDaysLeft !== null && !isExpired && (
                <p className="text-[10px] md:text-[11px] text-slate-400 font-bold">
                  متبقي <span className="text-white text-sm">{subscriptionDaysLeft}</span> يوم
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🎭 IDENTITY MODE CARD */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mx-2 md:mx-0">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-100">
              <FaUserGraduate className="text-white text-xl" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-lg">وضع الهوية (Identity Mode)</h2>
              <p className="text-[11px] text-slate-400 font-bold">كيف يتعامل النظام مع هذا الحساب؟</p>
            </div>
          </div>
          {/* Toggle */}
          <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setCenterType('center')}
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                centerType === 'center'
                  ? 'bg-white text-blue-700 shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              🏫 سنتر
            </button>
            <button
              type="button"
              onClick={() => setCenterType('instructor')}
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                centerType === 'instructor'
                  ? 'bg-white text-violet-700 shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              👨‍🏫 مدرس
            </button>
          </div>
        </div>

        {/* Instructor Fields — تظهر فقط في Instructor Mode */}
        {centerType === 'instructor' && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 🖼️ Instructor Photo */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {instructorFields.instructor_photo_url ? (
                  <img
                    src={instructorFields.instructor_photo_url}
                    alt="صورة المدرس"
                    className="w-32 h-32 rounded-full object-cover border-4 border-violet-100 shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-violet-50 border-4 border-dashed border-violet-200 flex items-center justify-center">
                    <FaUserGraduate className="text-violet-300 text-4xl" />
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                    <FaSync className="animate-spin text-violet-600 text-2xl" />
                  </div>
                )}
              </div>
              <input type="file" id="instructorPhotoInput" hidden accept="image/*" onChange={handleInstructorPhotoUpload} />
              <label
                htmlFor="instructorPhotoInput"
                className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-2xl font-black cursor-pointer hover:bg-violet-700 transition text-sm"
              >
                <FaUpload /> {uploadingPhoto ? 'جاري...' : 'رفع صورة'}
              </label>
              <p className="text-[10px] text-slate-400 font-bold text-center">
                صورة شخصية بخلفية سادة<br />مقترح: 400×400 بكسل
              </p>
            </div>

            {/* 📝 Instructor Info */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">اسم المدرس</label>
                <input
                  type="text"
                  value={instructorFields.instructor_name}
                  onChange={e => setInstructorFields(p => ({ ...p, instructor_name: e.target.value }))}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-violet-500 outline-none font-black text-slate-800 text-sm"
                  placeholder="أ/ محمد علي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">المادة / التخصص</label>
                <input
                  type="text"
                  value={instructorFields.instructor_subject}
                  onChange={e => setInstructorFields(p => ({ ...p, instructor_subject: e.target.value }))}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-violet-500 outline-none font-black text-slate-800 text-sm"
                  placeholder="رياضيات — ثانوي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">اللقب / الرتبة</label>
                <input
                  type="text"
                  value={instructorFields.instructor_title}
                  onChange={e => setInstructorFields(p => ({ ...p, instructor_title: e.target.value }))}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-violet-500 outline-none font-black text-slate-800 text-sm"
                  placeholder="أستاذ — خبرة 15 سنة"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">نبذة عن المدرس</label>
                <textarea
                  value={instructorFields.instructor_bio}
                  onChange={e => setInstructorFields(p => ({ ...p, instructor_bio: e.target.value }))}
                  rows={3}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-violet-500 outline-none font-bold text-slate-700 text-sm resize-none"
                  placeholder="أستاذ رياضيات بخبرة 15 عام، متخصص في تأسيس طلاب الثانوية العامة..."
                />
              </div>
            </div>

            {/* 🔮 Live Preview */}
            {(instructorFields.instructor_name || instructorFields.instructor_photo_url) && (
              <div className="md:col-span-3 bg-gradient-to-l from-violet-50 to-purple-50 rounded-3xl p-6 border border-violet-100">
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-4">معاينة — كيف سيظهر في النظام</p>
                <div className="flex items-center gap-5">
                  {instructorFields.instructor_photo_url ? (
                    <img src={instructorFields.instructor_photo_url} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-xl" alt="" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-violet-200 flex items-center justify-center font-black text-2xl text-violet-600">
                      {instructorFields.instructor_name?.[0] || '؟'}
                    </div>
                  )}
                  <div>
                    <p className="font-black text-slate-800 text-xl">أ/ {instructorFields.instructor_name || 'اسم المدرس'}</p>
                    <p className="text-sm font-bold text-violet-600">
                      {instructorFields.instructor_title}{instructorFields.instructor_title && instructorFields.instructor_subject ? ' · ' : ''}{instructorFields.instructor_subject}
                    </p>
                    {instructorFields.instructor_bio && (
                      <p className="text-xs text-slate-500 font-bold mt-1 max-w-lg line-clamp-1">{instructorFields.instructor_bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {centerType === 'center' && (
          <div className="px-8 py-6 flex items-center gap-4 bg-blue-50/30">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <FaBuilding className="text-blue-500" />
            </div>
            <p className="text-sm font-bold text-slate-500">
              في وضع <span className="text-blue-700 font-black">السنتر</span> — الشعار والاسم يُجلبان من قسم هوية السنتر أدناه.
            </p>
          </div>
        )}
      </div>

      {/* 🎯 SETTINGS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 px-2 md:px-0">

        {/* 🔵 IDENTITY CARD */}
        <div className="md:col-span-2 lg:col-span-2 bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-blue-50/50 to-white px-6 md:px-8 py-5 md:py-6 border-b border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
              <FaBuilding className="text-white text-lg md:text-xl" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base md:text-lg">هوية السنتر</h2>
              <p className="text-[10px] md:text-[11px] text-slate-400 font-bold tracking-wide">إدارة الشعار ومعلومات التواصل الأساسية</p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6 md:space-y-8 flex-1">
            {/* Logo Upload */}
            <div className="p-6 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all group">
              <label className="block text-xs md:text-sm font-black mb-4 flex items-center gap-2 text-slate-700">
                <FaImage className="text-blue-500" /> شعار السنتر (Logo)
              </label>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-center overflow-hidden relative shadow-inner p-4 grayscale hover:grayscale-0 transition-all duration-500">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <FaImage className="text-slate-200 text-4xl" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                      <FaSync className="animate-spin text-blue-600 text-2xl" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-right space-y-3">
                  <input type="file" id="logoInput" hidden accept="image/*" onChange={handleLogoUpload} />
                  <label htmlFor="logoInput" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black cursor-pointer hover:bg-black hover:shadow-xl transition-all text-xs md:text-sm active:scale-95">
                    <FaUpload /> {uploading ? 'جاري الرفع...' : 'تغيير الشعار'}
                  </label>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    يفضل استخدام صور بخلفية شفافة (PNG) <br className="hidden sm:block" /> وبحجم لا يقل عن 200×200 بكسل.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mr-1">اسم السنتر</label>
                <div className="relative group">
                  <FaBuilding className="absolute top-4 right-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    value={settings.center_name}
                    onChange={(e) => setSettings({ ...settings, center_name: e.target.value })}
                    className="w-full p-4 pr-12 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-black text-gray-900 text-sm appearance-none opacity-100 placeholder:text-gray-400"
                    placeholder="مثلاً: سنتر السراج"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mr-1">رقم تواصل السنتر</label>
                <div className="relative group">
                   <FaPhoneAlt className="absolute top-4 right-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="tel"
                    value={settings.center_phone}
                    onChange={(e) => setSettings({ ...settings, center_phone: e.target.value })}
                    className="w-full p-4 pr-12 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-black text-gray-900 text-sm appearance-none opacity-100 placeholder:text-gray-400"
                    placeholder="01xxxxxxxxx"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mr-1">كود بداية الطلاب</label>
                <div className="flex gap-2">
                  <div className="w-1/4 relative group">
                    <input
                      type="text"
                      value={settings.student_code_prefix}
                      onChange={(e) => setSettings({ ...settings, student_code_prefix: e.target.value })}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-black text-center text-gray-900 text-sm"
                      placeholder="S"
                    />
                    <p className="absolute -top-6 right-0 text-[10px] text-slate-400 font-bold"></p>
                  </div>
                  <div className="flex-1 relative group">
                    <input
                      type="number"
                      value={settings.next_student_code}
                      onChange={(e) => setSettings({ ...settings, next_student_code: parseInt(e.target.value) || 0 })}
                      className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-black text-gray-900 text-sm appearance-none opacity-100 placeholder:text-gray-400"
                      placeholder="100000"
                    />
                     <p className="absolute -top-6 right-0 text-[10px] text-slate-400 font-bold">رقم البداية</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mr-1">
                  مثال للكود الحالي: <span className="text-blue-600 font-black">{settings.student_code_prefix}{settings.next_student_code}</span>
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mr-1">عنوان السنتر بالتفصيل</label>
                <div className="relative group">
                  <FaMapMarkerAlt className="absolute top-4 right-4 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full p-4 pr-12 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-50 focus:border-red-500 outline-none transition-all font-black text-gray-900 text-sm appearance-none opacity-100 placeholder:text-gray-400"
                    placeholder="المحافظة - المدينة - الشارع..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 MESSAGES CARD */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-emerald-50/50 to-white px-6 md:px-8 py-5 md:py-6 border-b border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
              <FaWhatsapp className="text-white text-lg md:text-xl" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base md:text-lg">قوالب الرسائل</h2>
              <p className="text-[10px] md:text-[11px] text-slate-400 font-bold">تنسيق الرسائل التلقائية</p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6 flex-1">
            <div className="bg-emerald-50/30 p-5 rounded-3xl border border-emerald-100 space-y-3">
              <label className="block text-[11px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                <FaCode /> قالب رسالة التقرير
              </label>
              <textarea
                value={settings.whatsapp_template || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_template: e.target.value })}
                className="w-full p-4 bg-white border border-emerald-100 rounded-2xl h-28 font-mono text-xs focus:ring-4 focus:ring-emerald-50 outline-none resize-none leading-relaxed"
                placeholder="تقرير الطالب [name]..."
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['name', 'center', 'link'].map(tag => (
                  <span key={tag} className="text-[9px] bg-white px-2 py-1 rounded-lg border border-emerald-100 font-black text-emerald-600 uppercase tracking-tighter">[{tag}]</span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">رسالة الديون</label>
                <textarea
                  value={settings.msg_debt || ''}
                  onChange={(e) => setSettings({ ...settings, msg_debt: e.target.value })}
                  className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl h-24 text-xs font-black focus:ring-4 focus:ring-blue-50 outline-none resize-none text-gray-900 appearance-none opacity-100 placeholder:text-gray-400"
                  placeholder="استخدم [name] و [amount]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-1">رسالة الغياب</label>
                <textarea
                  value={settings.msg_absent || ''}
                  onChange={(e) => setSettings({ ...settings, msg_absent: e.target.value })}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl h-24 text-xs font-black focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none resize-none"
                  placeholder="استخدم [name] و [topic]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 🟣 STAGES CARD */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-purple-50/50 to-white px-6 md:px-8 py-5 md:py-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
                <FaLayerGroup className="text-white text-lg md:text-xl" />
              </div>
              <div>
                <h2 className="font-black text-slate-800 text-base md:text-lg">المراحل الدراسية</h2>
                <p className="text-[10px] md:text-[11px] text-slate-400 font-bold">ترتيب الصفوف والمراحل</p>
              </div>
            </div>
            <span className="text-[10px] bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl font-black">{stages.length} صف</span>
          </div>

          <div className="p-6 md:p-8 space-y-6 flex-1">
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-1">إضافة صف جديد</label>
                  <input
                    type="text"
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                    placeholder="مثلاً: أولى ثانوي"
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-purple-50 focus:border-purple-500 font-black text-sm transition-all text-gray-900 appearance-none opacity-100 placeholder:text-gray-400"
                  />
               </div>
               <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                     <FaSortNumericDown className="absolute top-4 right-4 text-purple-300" />
                     <input
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                        className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-2xl outline-none text-center font-black"
                     />
                  </div>
                  <button
                    onClick={handleAddStage}
                    disabled={saving}
                    className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-purple-700 transition disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
                  >
                    <FaPlus /> إضافة
                  </button>
               </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl hover:border-purple-200 hover:shadow-md transition group">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-black text-xs border border-purple-100">{stage.sort_order}</span>
                    <span className="font-black text-slate-700 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px] md:max-w-[200px]">{stage.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="text-slate-300 hover:text-red-500 p-2 transition-all md:opacity-0 md:group-hover:opacity-100"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              ))}
              {stages.length === 0 && (
                <div className="text-center py-10 opacity-40">
                  <FaUserGraduate className="text-slate-300 text-4xl mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">لا يوجد صفوف</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🔴 FINANCE CARD */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-red-50/50 to-white px-6 md:px-8 py-5 md:py-6 border-b border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-100">
              <FaMoneyBillWave className="text-white text-lg md:text-xl" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base md:text-lg">السياسات المالية</h2>
              <p className="text-[10px] md:text-[11px] text-slate-400 font-bold tracking-wide">الديون والمنع التلقائي</p>
            </div>
          </div>

          <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
            <div className="bg-red-50/40 p-6 md:p-8 rounded-[2rem] border-2 border-dashed border-red-100 text-center space-y-4">
              <label className="text-[10px] md:text-xs font-black text-red-800 uppercase tracking-widest block">حد المديونية الأقصى (ج.م)</label>
              <div className="relative">
                 <input
                    type="number"
                    value={settings.debt_limit}
                    onChange={(e) => setSettings({ ...settings, debt_limit: parseInt(e.target.value) || 0 })}
                    className="w-full h-24 bg-transparent outline-none text-center font-black text-5xl md:text-6xl text-red-600 transition-all focus:scale-110"
                    placeholder="300"
                  />
                  <div className="absolute -bottom-2 inset-x-0 h-[2px] bg-red-200"></div>
              </div>
              <p className="text-[9px] md:text-[10px] text-red-400 font-black uppercase tracking-tighter pt-2">
                سيتم منع الطالب من الدخول تلقائياً <br /> عند بلوغ هذا الرقم
              </p>
            </div>
          </div>
        </div>

        {/* 🟤 APPEARANCE CARD */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-indigo-50/50 to-white px-6 md:px-8 py-5 md:py-6 border-b border-slate-50 flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <FaPaintBrush className="text-white text-lg md:text-xl" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-base md:text-lg">المظهر والتقارير</h2>
              <p className="text-[10px] md:text-[11px] text-slate-400 font-bold tracking-wide">التخصيص وتذييل الورق</p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6 flex-1">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1">لون النظام المفضل</label>
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-3xl border border-slate-100">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-14 h-14 rounded-2xl cursor-pointer border-none bg-transparent"
                />
                <div className="flex-1 text-center font-mono font-black text-slate-700 bg-white py-3 rounded-2xl shadow-sm border border-slate-100">
                  {settings.primary_color}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1">تذييل التقارير المطبوعة</label>
              <textarea
                value={settings.report_footer || ''}
                onChange={(e) => setSettings({ ...settings, report_footer: e.target.value })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-3xl h-32 text-xs font-black focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none resize-none"
                placeholder="شكراً لثقتكم بنا..."
              />
            </div>
          </div>
        </div>

        {/* 🔵 ROOMS CARD */}
        <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-l from-cyan-50/50 to-white px-6 md:px-8 py-5 md:py-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-100">
                <FaDoorOpen className="text-white text-lg md:text-xl" />
              </div>
              <div>
                <h2 className="font-black text-slate-800 text-base md:text-lg">قاعات السنتر</h2>
                <p className="text-[10px] md:text-[11px] text-slate-400 font-bold tracking-wide">إدارة مساحات التدريس</p>
              </div>
            </div>
            <span className="text-[10px] bg-cyan-100 text-cyan-700 px-3 py-1.5 rounded-xl font-black">{rooms.length} قاعة</span>
          </div>

          <div className="p-6 md:p-8 space-y-6 flex-1">
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block mr-1">إضافة قاعة جديدة</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="مثلاً: قاعة A"
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-cyan-50 focus:border-cyan-500 font-black text-sm transition-all"
                  />
               </div>
               <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                     <input
                        type="number"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(e.target.value)}
                        placeholder="السعة"
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none text-center font-black"
                     />
                  </div>
                  <button
                    onClick={handleAddRoom}
                    disabled={saving}
                    className="bg-cyan-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-cyan-700 transition disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-cyan-100"
                  >
                    <FaPlus /> إضافة
                  </button>
               </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl hover:border-cyan-200 hover:shadow-md transition group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center border border-cyan-100">
                      <FaDoorOpen />
                    </div>
                    <div>
                      <p className="font-black text-slate-700 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{room.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">السعة: {room.capacity} طالب</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-slate-200 hover:text-red-500 p-2 transition-all md:opacity-0 md:group-hover:opacity-100"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              ))}
              {rooms.length === 0 && (
                <div className="text-center py-10 opacity-30">
                  <FaDoorOpen className="text-slate-300 text-4xl mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">لا توجد قاعات</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 💾 SAVE BUTTON */}
      <div className="fixed bottom-0 md:bottom-6 left-0 right-0 md:left-6 md:right-auto md:w-auto z-50 p-4 md:p-0">
         <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/50 p-2 md:p-3 w-full md:w-80 lg:w-[420px]">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="w-full bg-slate-900 text-white p-4 md:p-5 rounded-[1.5rem] font-black text-base md:text-lg flex items-center justify-center gap-3 hover:bg-black hover:shadow-2xl transition-all disabled:bg-slate-300 shadow-xl shadow-slate-200 active:scale-95"
            >
              <FaSave className="text-xl text-blue-400" />
              {saving ? 'جاري الحفظ...' : 'حفظ جميع التغييرات'}
            </button>
         </div>
      </div>

    </div>
  );
}