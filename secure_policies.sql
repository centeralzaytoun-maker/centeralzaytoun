-- ========================================
-- سياسات آمنة لـ staff_profiles
-- ========================================

-- 1. حذف السياسة المؤقتة غير الآمنة
DROP POLICY IF EXISTS "Enable all access for staff_profiles" ON public.staff_profiles;

-- 2. سياسة: المستخدم يشوف بروفايله بس
CREATE POLICY "Users can view their own profile"
ON public.staff_profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. سياسة: المستخدم يعدل بروفايله بس
CREATE POLICY "Users can update their own profile"
ON public.staff_profiles
FOR UPDATE
USING (auth.uid() = id);

-- 4. سياسة: الأدمن يشوف كل الموظفين
CREATE POLICY "Admins can view all staff profiles"
ON public.staff_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.id = auth.uid() AND sp.role = 'admin'
  )
);

-- 5. سياسة: الأدمن يعدل كل الموظفين
CREATE POLICY "Admins can update all staff profiles"
ON public.staff_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.id = auth.uid() AND sp.role = 'admin'
  )
);

-- 6. سياسة: الأدمن يضيف موظفين جدد
CREATE POLICY "Admins can insert staff profiles"
ON public.staff_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.id = auth.uid() AND sp.role = 'admin'
  )
);

-- ========================================
-- ملاحظة: السياسات دي آمنة ومتوازنة
-- كل مستخدم يشوف بروفايله بس، الأدمن يشوف الكل
-- ========================================
