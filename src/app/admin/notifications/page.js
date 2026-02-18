'use client';

import { useState, useEffect, useMemo, useRef } from 'react'; 
import { supabaseBrowser } from '../../../lib/supabase';
import { 
    FaPaperPlane, FaUsers, FaUser, FaHistory, 
    FaFileAlt, FaShieldAlt, FaClock, FaFilter, FaEnvelopeOpenText, FaCheckDouble, FaSync
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast'; 

export default function AdminNotificationsPage() {
    const { centerId } = useAuth();
    
    useEffect(() => {
        if (!centerId) {
            console.log('❌ No centerId found - waiting for authentication...');
            return;
        }
        console.log('✅ centerId available:', centerId);
    }, [centerId]);
    
    // البيانات الأساسية
    const [students, setStudents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [courses, setCourses] = useState([]); 
    const [history, setHistory] = useState([]); 
    const [staff, setStaff] = useState([]);

    // خيارات التصفية
    const [targetType, setTargetType] = useState('all'); 
    const [selectedGrade, setSelectedGrade] = useState(''); 
    const [selectedCourse, setSelectedCourse] = useState(''); 
    const [selectedTarget, setSelectedTarget] = useState(''); 
    
    // متغيرات البحث الذكي
    const [searchQuery, setSearchQuery] = useState(''); 
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isGradeDropdownOpen, setIsGradeDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    
    // 2. المرجع الخاص بصندوق البحث (عشان نعرف ضغطنا بره ولا جوه)
    const searchWrapperRef = useRef(null);

    // خيارات الرسالة
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [notification, setNotification] = useState({ title: '', message: '', type: 'info' });
    const [loading, setLoading] = useState(false);

    // 🆕 متغيرات القوالب المخصصة
    const [customTemplates, setCustomTemplates] = useState([]);

    // تحميل القوالب المحفوظة أول ما الصفحة تفتح
    useEffect(() => {
        const saved = localStorage.getItem('custom_notification_templates');
        if (saved) {
            setCustomTemplates(JSON.parse(saved));
        }
    }, []);

    // دالة حفظ القالب الجديد
    const handleSaveCustomTemplate = (e) => {
        e.preventDefault(); // عشان ميعملش ريفريش للصفحة
        if (!notification.title.trim() || !notification.message.trim()) {
            toast.error('❌ يرجى كتابة عنوان ورسالة أولاً لحفظهما كقالب');
            return;
        }
        
        const newTemplate = {
            id: Date.now(),
            title: notification.title,
            message: notification.message,
            type: notification.type
        };

        const updatedTemplates = [...customTemplates, newTemplate];
        setCustomTemplates(updatedTemplates);
        localStorage.setItem('custom_notification_templates', JSON.stringify(updatedTemplates));
        
        toast.success('✅ تم حفظ القالب بنجاح');
    };

    // دالة حذف قالب
    const handleDeleteCustomTemplate = (id) => {
        const updated = customTemplates.filter(t => t.id !== id);
        setCustomTemplates(updated);
        localStorage.setItem('custom_notification_templates', JSON.stringify(updated));
        toast.success('🗑️ تم حذف القالب');
    };

    const templates = [
        { id: 1, title: '📢 تنبيه بوجود امتحان', message: 'عزيزي [student]، نحيطكم علماً بوجود امتحان مادة [course] في الموعد القادم.', type: 'warning' },
        { id: 2, title: '⚠️ تنبيه غياب', message: 'نحيطكم علماً بغياب الطالب [student] عن حصة مادة [course] اليوم.', type: 'warning' },
        { id: 3, title: '🕒 تعديل موعد', message: 'تم تعديل موعد حصة [course] لتصبح الساعة [time].', type: 'info' }
    ];

    // 🆕 مرجع لمربع النص عشان نعرف مكان الماوس فين بالظبط
    const messageInputRef = useRef(null);

    // 🆕 قائمة المتغيرات المتاحة
    const dynamicTags = [
        { label: 'اسم الطالب', tag: '[student]' },
        { label: 'اسم الكورس', tag: '[course]' },
        { label: 'الوقت', tag: '[time]' },
        { label: 'التاريخ', tag: '[date]' },
        { label: 'المدرس', tag: '[instructor]' }
    ];

    // 🆕 دالة إدراج المتغير في مكان وقوف الماوس
    const handleInsertTag = (tag) => {
        const textarea = messageInputRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentMessage = notification.message || '';
            
            // تركيب الرسالة الجديدة (النص اللي قبل الماوس + المتغير + النص اللي بعد الماوس)
            const newMessage = currentMessage.substring(0, start) + tag + currentMessage.substring(end);
            
            setNotification({ ...notification, message: newMessage });
            
            // تركيز الماوس بعد الكلمة اللي اتضافت فوراً
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + tag.length, start + tag.length);
            }, 0);
        } else {
            // كاحتياطي لو المرجع مش شغال، بيضيفها في الآخر
            setNotification({ ...notification, message: (notification.message || '') + ' ' + tag });
        }
    };

    const groupsMap = useMemo(() => new Map(groups.map(g => [g.id, g])), [groups]);
    const coursesMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

    useEffect(() => {
        if (centerId) {
            fetchStaticData();
            fetchHistory();
        }
    }, [centerId]);

    // 3. كود سحري لقفل القائمة عند الضغط خارجها
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchWrapperRef]);

    // 1️⃣ جلب البيانات
    const fetchStaticData = async () => {
        if (!centerId) return;
        setLoading(true);
        try {
            const { data: coursesData } = await supabaseBrowser
                .from('courses')
                .select('id, name, instructor, grade')
                .eq('center_id', centerId);

            const { data: grData } = await supabaseBrowser.from('groups').select('id, name, course_id').eq('center_id', centerId);
            const { data: staffData } = await supabaseBrowser.from('staff_profiles').select('id, full_name').in('role', ['admin', 'staff']).eq('center_id', centerId);

            const { data: stData } = await supabaseBrowser.from('students').select(`id, name, group_ids, grade`).eq('center_id', centerId);
            const normalizedStudents = (stData || []).map(s => ({
                ...s,
                group_ids_array: Array.isArray(s.group_ids) ? s.group_ids : Object.values(s.group_ids || {})
            }));
            
            setCourses(coursesData || []);
            setStudents(normalizedStudents);
            setGroups(grData || []);
            setStaff(staffData || []);

        } catch (error) {
            console.error("Critical Error:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!centerId) return;
        try {
            const { data: histData } = await supabaseBrowser
                .from('notifications')
                .select(`*, students(name, grade)`)
                .eq('center_id', centerId)
                .order('created_at', { ascending: false })
                .limit(20);
            setHistory(histData || []);
        } catch (e) { console.error(e); }
    };

    // 2️⃣ منطق الفلترة
    const uniqueGrades = useMemo(() => {
        const grades = courses.map(c => c.grade).filter(Boolean);
        return [...new Set(grades)];
    }, [courses]);

    const filteredCourses = useMemo(() => {
        if (!selectedGrade) return [];
        return courses.filter(c => c.grade?.trim() === selectedGrade?.trim());
    }, [selectedGrade, courses]);

    const filteredGroups = useMemo(() => {
        if (!selectedCourse) return [];
        return groups.filter(g => g.course_id === selectedCourse);
    }, [selectedCourse, groups]);

    const filteredStudents = useMemo(() => {
        if (!selectedCourse) return [];
        const targetGroupIds = groups
            .filter(g => g.course_id === selectedCourse)
            .map(g => g.id);
            
        return students.filter(s => 
            s.group_ids_array?.some(gid => targetGroupIds.includes(gid))
        );
    }, [selectedCourse, groups, students]);

    const searchableStudents = useMemo(() => {
        if (!searchQuery) return filteredStudents;
        return filteredStudents.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [filteredStudents, searchQuery]);

    // 3️⃣ دوال التحكم
    const handleTypeChange = (type) => {
        setTargetType(type);
        setSelectedGrade('');
        setSelectedCourse('');
        setSelectedTarget('');
        setSearchQuery(''); 
        setIsGradeDropdownOpen(false);
        setIsCourseDropdownOpen(false);
        setIsGroupDropdownOpen(false);
    };

    const handleSelectStudent = (student) => {
        setSelectedTarget(student.id);
        setSearchQuery(student.name);
        setIsDropdownOpen(false);
    };

    const applyTemplate = (tpl) => {
        setNotification({ title: tpl.title, message: tpl.message, type: tpl.type });
    };

    const sendNotification = async (e) => {
        e.preventDefault();
        if (targetType !== 'all' && !selectedTarget) return alert("يرجى إكمال خطوات البحث واختيار الهدف ⚠️");
        if (!centerId) {
            alert('⚠️ لم يتم تحديد المركز! يرجى تسجيل الدخول مرة أخرى.');
            return;
        }
        
        setLoading(true);
        try {
            let targetList = [];
            if (targetType === 'all') {
                targetList = students;
            } else if (targetType === 'group') {
                targetList = students.filter(st => st.group_ids_array?.includes(selectedTarget));
            } else {
                const student = students.find(s => s.id === selectedTarget);
                if (!student) throw new Error("الطالب غير موجود");
                targetList = [student];
            }

            if (targetList.length === 0) throw new Error("لا يوجد طلاب في هذا النطاق");

            const notificationsData = targetList.map(st => {
                let courseName = "المادة";
                if (selectedCourse) {
                    courseName = coursesMap.get(selectedCourse)?.name || "المادة";
                }

                let customizedMsg = notification.message
                    .replace(/\[student\]/g, st.name)
                    .replace(/\[course\]/g, courseName);

                return {
                    student_id: st.id,
                    title: notification.title,
                    message: customizedMsg,
                    type: notification.type, 
                    status: isScheduled ? 'scheduled' : 'sent',
                    scheduled_at: isScheduled ? new Date(scheduledTime).toISOString() : null,
                    center_id: centerId
                };
            });

            const { error } = await supabaseBrowser
                .from('notifications')
                .insert(notificationsData);
            if (error) throw new Error(error.message);

            toast.success(isScheduled ? "⏳ تم الجدولة بنجاح" : `🚀 تم الإرسال لـ ${targetList.length} طالب`);
            setNotification({ title: '', message: '', type: 'info' });
            setIsScheduled(false);
            fetchHistory();
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            alert('❌ خطأ: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen" dir="rtl">
            <Toaster position="top-center" />
            
            <div className="max-w-7xl mx-auto mb-8 md:mb-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-right w-full md:w-auto">
                        <h1 className="text-2xl md:text-4xl font-black text-gray-800 flex items-center justify-center md:justify-start gap-4">
                            <FaShieldAlt className="text-blue-600 shrink-0" /> <span>لوحة البث المتقدمة</span>
                        </h1>
                        <p className="text-gray-500 mt-2 text-xs md:text-sm font-bold opacity-80">إرسال تنبيهات جماعية، جدولة رسائل، وإدارة قوالب التواصل.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto items-start">
                
                {/* Templates Column */}
                <div className="order-2 lg:order-1 space-y-4">
                    <h3 className="font-black text-gray-400 text-[10px] md:text-xs px-2 uppercase flex items-center gap-2 mb-4 tracking-wider">
                        <FaFileAlt className="text-blue-500" /> قوالب جاهزة
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        {templates.map(tpl => (
                            <button key={tpl.id} onClick={() => applyTemplate(tpl)} className="w-full bg-white p-4 rounded-2xl border-2 border-transparent hover:border-blue-500 hover:shadow-lg shadow-sm text-right transition-all group active:scale-95">
                                <p className="text-xs font-black text-blue-900 group-hover:text-blue-600 truncate">{tpl.title}</p>
                                <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 font-bold">{tpl.message}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Action Column */}
                <div className="order-1 lg:order-2 lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-gray-100 border border-gray-100 p-6 md:p-10">
                        <form onSubmit={sendNotification} className="space-y-8">
                            
                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">نطاق البث والهدف</label>
                                <div className="grid grid-cols-3 gap-3 md:gap-4">
                                    {['all', 'group', 'student'].map((type) => (
                                        <button key={type} type="button" onClick={() => handleTypeChange(type)}
                                            className={`h-16 md:h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 ${targetType === type ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' : 'border-gray-50 text-gray-400 hover:bg-gray-50'}`}>
                                            <FaUsers size={18}/>
                                            <span className="text-[9px] md:text-[10px] font-black">{type === 'all' ? 'الكل' : type === 'group' ? 'مجموعات' : 'فردي'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {targetType !== 'all' && (
                                <div className="bg-blue-50/50 p-5 md:p-6 rounded-[1.75rem] border border-blue-100 space-y-5 animate-in slide-in-from-top-4 duration-300">
                                    <h4 className="text-[10px] font-black text-blue-600 flex items-center gap-2 uppercase tracking-wider"><FaFilter/> تصفية النطاق</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-1">1. الصف الدراسي</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsGradeDropdownOpen(!isGradeDropdownOpen)}
                                                    className="w-full h-12 px-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl text-xs font-black flex items-center justify-between transition-all shadow-sm"
                                                >
                                                    <span className="truncate">{selectedGrade || 'اختر الصف'}</span>
                                                    <svg className={`w-4 h-4 text-blue-600 transition-transform ${isGradeDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                {isGradeDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setIsGradeDropdownOpen(false)}></div>
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                                                {uniqueGrades.map(g => (
                                                                    <button
                                                                        key={g}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedGrade(g);
                                                                            setSelectedCourse('');
                                                                            setSelectedTarget('');
                                                                            setSearchQuery('');
                                                                            setIsGradeDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors ${selectedGrade === g ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                                    >
                                                                        {g}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {selectedGrade && (
                                            <div className="space-y-1.5 animate-in fade-in slide-in-from-right-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase mr-1">2. الكورس والمدرس</label>
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                                                        className="w-full h-12 px-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl text-xs font-black flex items-center justify-between transition-all shadow-sm"
                                                    >
                                                        <span className="truncate">
                                                            {selectedCourse ? `${filteredCourses.find(c => c.id === selectedCourse)?.name} (أ/ ${filteredCourses.find(c => c.id === selectedCourse)?.instructor})` : 'اختر الكورس'}
                                                        </span>
                                                        <svg className={`w-4 h-4 text-blue-600 transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {isCourseDropdownOpen && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setIsCourseDropdownOpen(false)}></div>
                                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                                                    {filteredCourses.map(c => (
                                                                        <button
                                                                            key={c.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedCourse(c.id);
                                                                                setSelectedTarget('');
                                                                                setSearchQuery('');
                                                                                setIsCourseDropdownOpen(false);
                                                                            }}
                                                                            className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${selectedCourse === c.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                                        >
                                                                            <span>{c.name}</span>
                                                                            <span className="text-[9px] opacity-60">أ/ {c.instructor}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selectedCourse && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase mr-1">
                                                3. تحديد {targetType === 'group' ? 'المجموعة' : 'اسم الطالب'}
                                            </label>
                                            
                                            {targetType === 'group' ? (
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                                                        className="w-full h-12 px-4 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl text-xs font-black flex items-center justify-between transition-all text-blue-800 shadow-sm"
                                                    >
                                                        <span className="truncate">
                                                            {selectedTarget ? filteredGroups.find(g => g.id === selectedTarget)?.name : '-- اختر المجموعة --'}
                                                        </span>
                                                        <svg className={`w-4 h-4 text-blue-600 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>

                                                    {isGroupDropdownOpen && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setIsGroupDropdownOpen(false)}></div>
                                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                                <div className="max-h-56 overflow-y-auto custom-scrollbar">
                                                                    {filteredGroups.map(g => (
                                                                        <button
                                                                            key={g.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedTarget(g.id);
                                                                                setIsGroupDropdownOpen(false);
                                                                            }}
                                                                            className={`w-full p-4 text-right text-xs font-black hover:bg-blue-50 transition-colors ${selectedTarget === g.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                                        >
                                                                            {g.name}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative" ref={searchWrapperRef}>
                                                    <input
                                                        type="text"
                                                        placeholder="ابدأ بكتابة اسم الطالب للبحث.."
                                                        value={searchQuery}
                                                        onChange={(e) => {
                                                            setSearchQuery(e.target.value);
                                                            setIsDropdownOpen(true);
                                                            setSelectedTarget('');
                                                        }}
                                                        onFocus={() => setIsDropdownOpen(true)}
                                                        className="w-full h-12 px-4 bg-white border-2 border-blue-200 focus:border-blue-600 rounded-xl text-xs font-black outline-none transition-all text-blue-800 placeholder-gray-300 shadow-sm"
                                                    />
                                                    
                                                    {isDropdownOpen && (
                                                        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-blue-100 rounded-2xl shadow-2xl max-h-56 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="overflow-y-auto custom-scrollbar">
                                                                {searchableStudents.length > 0 ? searchableStudents.map(s => (
                                                                    <button 
                                                                        key={s.id}
                                                                        type="button"
                                                                        onClick={() => handleSelectStudent(s)}
                                                                        className="w-full p-4 text-right text-xs font-black text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-gray-50 last:border-0"
                                                                    >
                                                                        {s.name}
                                                                    </button>
                                                                )) : (
                                                                    <div className="p-8 text-center text-[10px] text-gray-300 font-bold italic">لا يوجد نتائج لهذا البحث</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mr-1">محتوى الرسالة</label>
                                <div className="space-y-4">
                                    <input type="text" required placeholder="عنوان الإشعار (مثلاً: تنبيه هام)" className="w-full h-12 md:h-14 px-5 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl md:rounded-2xl font-black outline-none transition-all shadow-sm" value={notification.title} onChange={e => setNotification({...notification, title: e.target.value})} />
                                    
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {dynamicTags.map((item, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => handleInsertTag(item.tag)}
                                                    className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                                                    title={`إضافة ${item.tag}`}
                                                >
                                                    {item.label} <span className="opacity-40 ml-1">{item.tag}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="relative group">
                                            <textarea
                                                ref={messageInputRef}
                                                placeholder="اكتب هنا محتوى الرسالة، يمكنك استخدام المتغيرات الذكية أعلاه لرسائل مخصصة لكل طالب.."
                                                value={notification.message}
                                                onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                                                className="w-full p-5 md:p-6 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl md:rounded-3xl outline-none text-sm font-bold transition-all h-40 md:h-48 resize-none leading-relaxed shadow-sm shadow-inner"
                                                required
                                            />
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleSaveCustomTemplate}
                                                className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all font-black flex items-center gap-2 active:scale-95"
                                            >
                                                <span>💾</span> حفظ النص الحالي كقالب
                                            </button>
                                        </div>
                                    </div>

                                    {customTemplates.length > 0 && (
                                        <div className="p-4 md:p-5 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-2xl md:rounded-[1.5rem]">
                                            <h4 className="text-[10px] font-black text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                                <span>📂</span> قوالبك المخصصة
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {customTemplates.map(template => (
                                                    <div key={template.id} className="flex items-center bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden hover:border-blue-400 transition-all">
                                                        <button
                                                            type="button"
                                                            onClick={() => setNotification({
                                                                title: template.title,
                                                                message: template.message,
                                                                type: template.type || 'info'
                                                            })}
                                                            className="px-4 py-2 text-[10px] font-black text-gray-700 hover:text-blue-600 truncate max-w-[120px]"
                                                            title={template.message}
                                                        >
                                                            {template.title}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCustomTemplate(template.id)}
                                                            className="bg-red-50 text-red-500 px-3 py-2 text-[10px] hover:bg-red-500 hover:text-white transition-colors border-r border-gray-50 h-full"
                                                            title="حذف"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <div className={`flex-1 p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] border-2 transition-all ${isScheduled ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer mb-2">
                                        <input type="checkbox" checked={isScheduled} onChange={e => setIsScheduled(e.target.checked)} className="accent-orange-500 w-5 h-5" />
                                        <span className={`text-xs font-black flex items-center gap-2 ${isScheduled ? 'text-orange-700' : 'text-gray-400'}`}>
                                            <FaClock className={isScheduled ? 'animate-pulse' : ''}/> جدولة الإرسال لوقت لاحق
                                        </span>
                                    </label>
                                    {isScheduled && (
                                        <div className="animate-in slide-in-from-top-2 duration-300 mt-4">
                                            <input type="datetime-local" required className="w-full h-11 px-4 bg-white border border-orange-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-orange-200" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                                        </div>
                                    )}
                                </div>

                                <button type="submit" disabled={loading} className="md:w-1/3 h-auto md:h-auto bg-blue-600 text-white p-5 rounded-2xl md:rounded-[1.5rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-1 active:scale-95 disabled:bg-gray-200 disabled:shadow-none">
                                    {loading ? (
                                        <FaSync className="animate-spin text-xl leading-none" />
                                    ) : (
                                        <>
                                            <FaPaperPlane className="text-xl" />
                                            <span className="text-xs uppercase tracking-widest">{isScheduled ? 'تأكيد الجدولة' : 'بث الآن'}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>

                {/* History Column */}
                <div className="order-3 space-y-4">
                    <h3 className="font-black text-gray-400 text-[10px] md:text-xs px-2 uppercase flex items-center gap-2 mb-4 tracking-wider">
                        <FaHistory className="text-blue-500" /> آخر النشاطات
                    </h3>
                    <div className="space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
                        {history.length === 0 ? (
                            <div className="text-center py-12 text-gray-300 font-bold italic text-xs">لا يوجد سجل إرسال حالياً</div>
                        ) : history.map((item) => {
                            const isParentMsg = item.type === 'parent_message';
                            return (
                                <div key={item.id} className={`p-4 rounded-2xl md:rounded-[1.5rem] border shadow-sm relative transition-all group overflow-hidden ${
                                    isParentMsg ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100 hover:shadow-md'
                                }`}>
                                    <div className={`absolute top-0 right-0 w-1 h-full ${
                                        isParentMsg ? 'bg-amber-400' : 
                                        item.status === 'scheduled' ? 'bg-orange-400 animate-pulse' : 'bg-blue-600'
                                    }`}></div>

                                    <div className="flex justify-between items-start mb-2 pr-2">
                                        <div className="flex flex-col gap-1">
                                            {isParentMsg && (
                                                <span className="text-[10px] font-black text-amber-600 bg-amber-100/50 px-2.5 py-1 rounded-lg w-fit flex items-center gap-1.5 border border-amber-200">
                                                    <FaUser size={10}/> {item.students?.name || 'غير معروف'}
                                                </span>
                                            )}
                                            <h4 className={`font-black text-xs leading-tight ${isParentMsg ? 'text-amber-900' : 'text-gray-800'}`}>
                                                {item.title}
                                            </h4>
                                        </div>

                                        {isParentMsg ? (
                                            <FaEnvelopeOpenText className="text-amber-400 shrink-0" size={14} />
                                        ) : (
                                            <div className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                                                item.status === 'scheduled' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                                {item.status}
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-[10px] text-gray-500 line-clamp-2 md:line-clamp-3 leading-relaxed font-bold">
                                        {item.message}
                                    </p>
                                    
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                                        <span className="text-[9px] text-gray-300 font-black">
                                            {new Date(item.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                                        </span>
                                        {isParentMsg && (
                                            <button 
                                                onClick={() => {
                                                    setTargetType('student');
                                                    setSelectedTarget(item.student_id);
                                                    setNotification({ title: `رد: ${item.title}`, message: '', type: 'info' });
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="text-[9px] bg-white border-2 border-amber-200 text-amber-600 px-3 py-1 rounded-xl hover:bg-amber-600 hover:text-white transition-all font-black"
                                            >
                                                رد سريع ↩
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}