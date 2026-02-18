'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { FaLock } from 'react-icons/fa';

export default function AdminGuard({ userRole, children }) {
  const pathname = usePathname();
  const { role, allowedFeatures, loading } = useAuth();

  // 🛡️ خريطة حماية الصفحات: كل مسار والكلمة البرمجية (Permission) المطلوبة لدخوله
  const routePermissions = {
    '/admin/dashboard': 'finance:reports', 
    '/admin/staff': 'staff:view',
    '/admin/expenses': 'expenses:view',
    '/admin/audit': 'logs:view',
    '/admin/settings': 'settings:general',
    '/admin/students': 'students:view',
    '/admin/sessions': 'academic:sessions',
    '/admin/instructors': 'academic:sessions',
    '/admin/courses': 'academic:sessions',
    '/admin/groups': 'academic:sessions',
    '/admin/schedule': 'academic:schedule',
    '/admin/exams': 'academic:exams',
    '/admin/finance/wallets': 'wallet:view',
    '/admin/finance/debts': 'students:finance',
    '/admin/staff/permissions': 'page_staff_permissions',
    '/admin/store': 'store:sales',
    '/admin/notifications': 'page_notifications',
    '/admin/subscriptions': 'page_subscriptions',
  };

  const currentRoute = Object.keys(routePermissions)
    .sort((a, b) => b.length - a.length) // 🕵️ الترتيب من الأطول للأقصر لضمان أدق مطابقة
    .find(route => 
      pathname === route || pathname.startsWith(route + '/')
    );
  const requiredPermission = currentRoute ? routePermissions[currentRoute] : null;
  
  // 🛡️ منطق الأذونات المحدث:
  const isPackageFeature = requiredPermission?.startsWith('page_');
  
  // هل الموظف معاه الصلاحية المحددة؟
  const hasStaffPermission = allowedFeatures && allowedFeatures.includes(requiredPermission);
  
  // القاعدة النهائية للوصول:
  // 1. لو المسار مش محمي -> ادخل
  // 2. لو إنت Super Admin -> ادخل
  // 3. لو إنت Admin: ادخل لو مش ميزة باقة، أو لو ميزة باقة وموجودة في الـ features
  // 4. لو إنت Staff: لازم يكون معاك الـ permission المحددة (hasStaffPermission)
  // 🛡️ استخدام الرتبة من الـ Context أو من الـ Props كاحتياطي (للمنع من الـ Flicker)
  const effectiveRole = role || userRole;

  const hasAccess = !requiredPermission || 
                    effectiveRole === 'super_admin' || 
                    (effectiveRole === 'admin' && (!isPackageFeature || hasStaffPermission)) ||
                    (effectiveRole === 'staff' && hasStaffPermission);

  console.log(`🔐 AdminGuard: Path=${pathname} | EffectiveRole=${effectiveRole} | ContextRole=${role} | Loading=${loading} | HasAccess=${hasAccess} | PermsCount=${allowedFeatures?.length || 0}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!hasAccess) {
    const featureLabels = {
        'page_staff_permissions': 'نظام أذونات الوصول',
        'page_subscriptions': 'نظام الاشتراكات الشهرية',
        'finance:reports': 'نظام التقارير المالية',
        'staff:view': 'إدارة الموظفين',
        'expenses:view': 'إدارة المصروفات',
        'logs:view': 'سجل الرقابة الأمني',
        'settings:general': 'إعدادات النظام',
        'students:view': 'قاعدة بيانات الطلاب',
        'academic:sessions': 'إدارة الحصص والمواد',
        'academic:schedule': 'الجدول الدراسي الأسبوعي',
        'academic:exams': 'نظام الامتحانات والنتائج',
        'wallet:view': 'شحن محافظ الطلاب',
        'students:finance': 'سجل مديونيات الطلاب',
        'store:sales': 'المتجر والملازم',
    };

    const featureName = featureLabels[requiredPermission] || 'هذه الخاصية';
    
    // تخصيص الرسالة حسب سبب المنع
    const isMissingFromPackage = isPackageFeature && (!allowedFeatures || !allowedFeatures.includes(requiredPermission));
    const message = isMissingFromPackage 
      ? `عذراً، ${featureName} غير مفعل في باقتك الحالية. يرجى التواصل مع الإدارة للتفعيل.`
      : `عذراً، ليس لديك صلاحية الوصول إلى ${featureName}. يرجى مراجعة مدير السنتر.`;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-blue-100/50 border border-gray-100 max-w-lg w-full text-center relative overflow-hidden group">
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 via-red-500 to-red-400"></div>
          
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner group-hover:scale-110 transition-transform duration-500">
            <FaLock />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 mb-4 flex items-center justify-center gap-3">
            هذه الصفحة مقفولة! <span className="text-2xl">🔒</span>
          </h1>
          
          <p className="text-slate-500 font-bold mb-10 leading-relaxed px-4 text-lg">
            {message}
          </p>
          
          <Link 
            href="/admin/dashboard" 
            className="inline-block w-full bg-[#0f172a] text-white py-5 rounded-[20px] font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            العودة للرئيسية
          </Link>

          <p className="mt-8 text-xs font-black text-slate-300 uppercase tracking-widest">Smart Center • Access Control</p>
        </div>
      </div>
    );
  }

  return children;
}
