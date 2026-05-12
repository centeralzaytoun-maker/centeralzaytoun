-- ========================================================
-- 📋 Add Staff Page Visibility Permissions
-- ========================================================
-- This migration adds the missing page permissions for staff visibility control

-- 1. Add missing features for page visibility control
INSERT INTO public.features (id, name, description) VALUES
('page_staff_dashboard', 'لوحة الموظفين', 'عرض لوحة تحكم الموظفين الرئيسية'),
('page_instructors', 'إدارة المدرسين', 'الوصول لصفحة المدرسين'),
('page_courses', 'المواد الدراسية', 'إدارة المواد والمناهج'),
('page_groups', 'إدارة المجموعات', 'التحكم في مجموعات الطلاب'),
('page_store', 'المتجر والملازم', 'إدارة المخزن والمبيعات'),
('page_finance_reports', 'تقارير مالية', 'عرض التقارير المالية'),
('page_audit', 'سجل الرقابة', 'مراجعة سجل الأنشطة'),
('page_admin_dashboard', 'لوحة الإدارة', 'لوحة تحكم المديرين'),
('page_staff', 'الموظفين', 'إدارة حسابات الموظفين'),
('page_settings', 'إعدادات النظام', 'التحكم في إعدادات السنتر'),
('page_vouchers', 'أكواد الشحن', 'إدارة أكواد الخصم'),
('page_lessons', 'المحتوى الرقمي', 'إدارة الدروس والمحتوى'),
('page_support', 'تذاكر الدعم', 'نظام تذاكر الدعم الفني')
ON CONFLICT (id) DO NOTHING;

-- 2. Add corresponding permissions for granular control
INSERT INTO public.permissions (key, name, group_key) VALUES
('page_staff_dashboard', 'لوحة الموظفين', 'page'),
('page_instructors', 'إدارة المدرسين', 'page'),
('page_courses', 'المواد الدراسية', 'page'),
('page_groups', 'إدارة المجموعات', 'page'),
('page_store', 'المتجر والملازم', 'page'),
('page_finance_reports', 'تقارير مالية', 'page'),
('page_audit', 'سجل الرقابة', 'page'),
('page_admin_dashboard', 'لوحة الإدارة', 'page'),
('page_staff', 'الموظفين', 'page'),
('page_settings', 'إعدادات النظام', 'page'),
('page_vouchers', 'أكواد الشحن', 'page'),
('page_lessons', 'المحتوى الرقمي', 'page'),
('page_support', 'تذاكر الدعم', 'page')
ON CONFLICT (key) DO NOTHING;

-- 3. Update existing permissions to include description field (if missing)
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE public.permissions 
SET description = CASE 
    WHEN key = 'page_staff_dashboard' THEN 'الوصول لصفحة لوحة تحكم الموظفين'
    WHEN key = 'page_instructors' THEN 'الوصول لصفحة إدارة المدرسين'
    WHEN key = 'page_courses' THEN 'الوصول لصفحة المواد الدراسية'
    WHEN key = 'page_groups' THEN 'الوصول لصفحة إدارة المجموعات'
    WHEN key = 'page_schedule' THEN 'الوصول لصفحة الجدول الدراسي'
    WHEN key = 'page_finance_debts' THEN 'الوصول لصفحة المديونيات'
    WHEN key = 'page_store' THEN 'الوصول لصفحة المتجر والملازم'
    WHEN key = 'page_finance_reports' THEN 'الوصول لصفحة التقارير المالية'
    WHEN key = 'page_audit' THEN 'الوصول لصفحة سجل الرقابة'
    WHEN key = 'page_admin_dashboard' THEN 'الوصول لصفحة لوحة تحكم المديرين'
    WHEN key = 'page_staff' THEN 'الوصول لصفحة إدارة الموظفين'
    WHEN key = 'page_settings' THEN 'الوصول لصفحة إعدادات النظام'
    WHEN key = 'page_vouchers' THEN 'الوصول لصفحة أكواد الشحن'
    WHEN key = 'page_lessons' THEN 'الوصول لصفحة المحتوى الرقمي'
    WHEN key = 'page_support' THEN 'الوصول لصفحة تذاكر الدعم'
    ELSE description
END
WHERE key IN (
    'page_staff_dashboard', 'page_instructors', 'page_courses', 'page_groups', 
    'page_schedule', 'page_finance_debts', 'page_store', 'page_finance_reports',
    'page_audit', 'page_admin_dashboard', 'page_staff', 'page_settings',
    'page_vouchers', 'page_lessons', 'page_support'
);

-- 4. Add all new features to existing packages (optional - for testing)
-- This ensures existing packages have access to these features
INSERT INTO public.package_features (package_id, feature_id)
SELECT 
    package_id, 
    feature_id
FROM 
    public.packages,
    (SELECT id AS feature_id FROM public.features WHERE id LIKE 'page_%') AS features
WHERE 
    package_id IN (SELECT id FROM public.packages WHERE subscription_plan = 'free' OR subscription_plan = 'premium')
ON CONFLICT (package_id, feature_id) DO NOTHING;

-- 5. Final notice
DO $$
BEGIN
    RAISE NOTICE '✅ Staff page permissions have been added successfully!';
END $$;
