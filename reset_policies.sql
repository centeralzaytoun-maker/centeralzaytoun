-- ========================================
-- حذف كل السياسات القديمة وإعادة إنشائها
-- ========================================

-- 1. حذف كل السياسات الموجودة
DROP POLICY IF EXISTS "Allow middleware to read staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can view all staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can update all staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admins can insert staff profiles" ON public.staff_profiles;

-- 2. سياسة بسيطة للـ middleware (بدون recursion)
CREATE POLICY "Enable all access for staff_profiles"
ON public.staff_profiles
FOR ALL
USING (true);  -- مؤقتاً بس عشان نشوف المشكلة

-- 3. إدخال بيانات الأدمن (لو مش موجودة)
INSERT INTO public.staff_profiles (id, email, role, full_name)
SELECT 
  id, 
  email, 
  'admin',
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
FROM auth.users 
WHERE email = 'abdo@smart.com' 
AND NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE id = auth.users.id);

-- 4. فحص البيانات
SELECT * FROM public.staff_profiles WHERE email = 'abdo@smart.com';

-- ========================================
-- ملاحظة: دي سياسة مؤقتة شديدة التساهل!
-- لازم نرجع نعمل سياسات آمنة بعد ما نشوف المشكلة
-- ========================================
