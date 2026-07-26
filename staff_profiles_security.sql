-- ========================================
-- تأمين جدول staff_profiles
-- ========================================

-- 1. تفعيل RLS لو مش مفعل
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- 2. سياسة: المستخدمين يقدروا يشوفوا بروفايلهم بس
CREATE POLICY "Users can view their own profile"
ON public.staff_profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. سياسة: المستخدمين يقدروا يعدلوا بروفايلهم بس
CREATE POLICY "Users can update their own profile"
ON public.staff_profiles
FOR UPDATE
USING (auth.uid() = id);

-- 4. سياسة: الأدمن يقدر يشوف كل الموظفين
CREATE POLICY "Admins can view all staff profiles"
ON public.staff_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. سياسة: الأدمن يقدر يعدل كل الموظفين
CREATE POLICY "Admins can update all staff profiles"
ON public.staff_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. سياسة: الأدمن يقدر يضيف موظفين جدد
CREATE POLICY "Admins can insert staff profiles"
ON public.staff_profiles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ========================================
-- ملاحظات أمنية:
-- ========================================
-- ✅ الـ middleware بيجيب الدور من staff_profiles مباشرة
-- ✅ مش بيستخدم user_metadata خليها تكون فاضي
-- ✅ لو المستخدم مش موجود، الدور بيكون null مش 'student'
-- ✅ RLS policies بتضمن حماية الداتابيز نفسها
-- ✅ الأدمن لوحده اللي يقدر يشوف/يعدل كل البيانات
-- ========================================
