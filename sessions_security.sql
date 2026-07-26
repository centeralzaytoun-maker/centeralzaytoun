-- ========================================
-- تأمين جدول السيشنات (Sessions Security)
-- ========================================

-- 1. تفعيل الحماية على جدول السيشنات
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 2. سياسة للأدمن: السماح بحذف أي سيشن
CREATE POLICY "Admins can delete any session"
ON public.sessions
FOR DELETE
USING (
  (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'admin'
);

-- 3. سياسة للموظف (staff): السماح بحذف السيشن غير المكتملة فقط
CREATE POLICY "Staff can delete open sessions only"
ON public.sessions
FOR DELETE
USING (
  (SELECT role FROM public.staff_profiles WHERE id = auth.uid()) = 'staff'
  AND
  is_completed = false  -- 👈 الشرط السحري: لازم تكون لسه مفتوحة
);

-- ========================================
-- ملاحظات هامة:
-- ========================================
-- 1. الأدمن (admin): يقدر يحذف أي سيشن (مفتوحة أو مقفولة)
-- 2. الموظف (staff): يقدر يحذف السيشن المفتوحة فقط (is_completed = false)
-- 3. لو الموظف حاول يحذف سيشن مقفولة: الداتابيز هترفض الطلب
-- 4. الفرونت إند متأمن أيضاً عشان يعرض الزرار بشكل مناسب
-- ========================================
