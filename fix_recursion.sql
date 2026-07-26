-- ========================================
-- إصلاح مشكلة infinite recursion
-- ========================================

-- 1. حذف السياسة المؤقتة اللي بتسبب recursion
DROP POLICY IF EXISTS "Allow middleware to read staff_profiles" ON public.staff_profiles;

-- 2. إضافة سياسة صحيحة للـ middleware
CREATE POLICY "Allow service role to read staff profiles"
ON public.staff_profiles
FOR SELECT
USING (
  -- السماح للـ service role (middleware) يشوف كل البيانات
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR
  -- السماح للمستخدم يشوف بروفايله بس
  auth.uid() = id
);

-- 3. سياسة للأدمن يشوف كل الموظفين
CREATE POLICY "Admins can view all staff profiles"
ON public.staff_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles sp 
    WHERE sp.id = auth.uid() AND sp.role = 'admin'
  )
);

-- 4. التأكد إن RLS مفعل
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- 5. إدخال بيانات الأدمن (لو مش موجودة)
INSERT INTO public.staff_profiles (id, email, role, full_name)
SELECT 
  id, 
  email, 
  'admin',
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email)
FROM auth.users 
WHERE email = 'abdo@smart.com' 
AND NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE id = auth.users.id);

-- ========================================
