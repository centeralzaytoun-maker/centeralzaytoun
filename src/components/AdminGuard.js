'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { FaLock } from 'react-icons/fa';

// ✅ Moved OUTSIDE the component — this is a static map, no reason to
// recreate it on every render. Previously it was recreated hundreds of
// times per second due to the re-render loop, causing GC pressure.
const ROUTE_PERMISSIONS = {
  '/admin/dashboard':        'page_reports',
  '/admin/staff':            'page_staff',
  '/admin/expenses':         'page_finance_expenses',
  '/admin/audit':            'page_audit',
  '/admin/settings':         'page_settings',
  '/admin/students':         'page_students',
  '/admin/sessions':         'page_sessions',
  '/admin/instructors':      'page_instructors',
  '/admin/courses':          'page_courses',
  '/admin/groups':           'page_groups',
  '/admin/schedule':         'page_schedule',
  '/admin/exams':            'page_exams',
  '/admin/finance/wallets':  'page_finance_wallets',
  '/admin/finance/debts':    'page_finance_debts',
  '/admin/staff/permissions':'page_staff_permissions',
  '/admin/store':            'page_store',
  '/admin/notifications':    'page_notifications',
  '/admin/subscriptions':    'page_subscriptions',
};

const FEATURE_LABELS = {
  'page_staff_permissions': 'نظام أذونات الوصول',
  'page_subscriptions':     'نظام الاشتراكات الشهرية',
  'page_reports':           'نظام التقارير المالية',
  'page_staff':             'إدارة الموظفين',
  'page_finance_expenses':  'إدارة المصروفات',
  'page_audit':             'سجل الرقابة الأمني',
  'page_settings':          'إعدادات النظام',
  'page_students':          'قاعدة بيانات الطلاب',
  'page_sessions':          'إدارة الحصص',
  'page_instructors':       'إدارة المعلمين',
  'page_courses':           'إدارة المواد',
  'page_groups':            'إدارة المجموعات',
  'page_schedule':          'الجدول الدراسي الأسبوعي',
  'page_exams':             'نظام الامتحانات والنتائج',
  'page_finance_wallets':   'شحن محافظ الطلاب',
  'page_finance_debts':     'سجل مديونيات الطلاب',
  'page_store':             'المتجر والملازم',
};

// Stable sorted keys — computed once at module load, not per render
const SORTED_ROUTES = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);

export default function AdminGuard({ userRole, children }) {
  const pathname = usePathname();
  const { role, allowedFeatures, loading } = useAuth();

  // ✅ useMemo so access logic only recomputes when inputs actually change
  const { hasAccess, message } = useMemo(() => {
    const effectiveRole = role || userRole;

    const currentRoute = SORTED_ROUTES.find(
      route => pathname === route || pathname.startsWith(route + '/')
    );
    const requiredPermission = currentRoute ? ROUTE_PERMISSIONS[currentRoute] : null;
    const isPackageFeature = requiredPermission?.startsWith('page_');
    const hasStaffPermission = allowedFeatures?.includes(requiredPermission) ?? false;

    const access =
      !requiredPermission ||
      effectiveRole === 'super_admin' ||
      (effectiveRole === 'admin' && (!isPackageFeature || hasStaffPermission)) ||
      (effectiveRole === 'staff' && hasStaffPermission);

    const featureName = FEATURE_LABELS[requiredPermission] || 'هذه الخاصية';
    const isMissingFromPackage =
      isPackageFeature && (!allowedFeatures || !allowedFeatures.includes(requiredPermission));

    const msg = isMissingFromPackage
      ? `عذراً، ${featureName} غير مفعل في باقتك الحالية. يرجى التواصل مع الإدارة للتفعيل.`
      : `عذراً، ليس لديك صلاحية الوصول إلى ${featureName}. يرجى مراجعة مدير السنتر.`;

    return { hasAccess: access, message: msg };
  }, [pathname, role, userRole, allowedFeatures]);

  // ✅ Removed console.log from render body — it was logging on EVERY render,
  // producing hundreds of log lines per second during the re-render loop.
  // If you need this during debugging, uncomment temporarily:
  // console.log(`🔐 AdminGuard: ${pathname} | role=${role || userRole} | access=${hasAccess}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-blue-100/50 border border-gray-100 max-w-lg w-full text-center relative overflow-hidden group">
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
