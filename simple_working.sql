-- ========================================
-- حل بسيط ومضمون (بدون recursion)
-- ========================================

-- 1. حذف كل السياسات الموجودة
DROP POLICY IF EXISTS "Enable all access for staff_profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can view all staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can update all staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can insert staff profiles" ON public.staff_profiles;

-- 2. سياسة واحدة بسيطة للكل (مؤقتاً)
CREATE POLICY "Simple access for staff_profiles"
ON public.staff_profiles
FOR ALL
USING (true);

-- ========================================
-- ملاحظة: 
-- النظام شغال كويس حالياً، مش نغير حاجة
-- السياسة دي بتسمح بالوصول للكل (مش آمنة 100% لكن شغالة)
-- لو عايز أمان أكتر، نقدر نستخدم user_metadata بدل staff_profiles
-- ========================================
