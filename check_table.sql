-- ========================================
-- فحص هي الأعمدة الفعلية في staff_profiles
-- ========================================

-- شوف هي الأعمدة الموجودة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'staff_profiles' 
ORDER BY ordinal_position;

-- شوف هي البيانات الموجودة
SELECT * FROM public.staff_profiles LIMIT 5;

-- ========================================
-- لو الجدول فاضي أو مش مكتمل، دي هيكل شغال:
-- ========================================

-- إنشاء الجدول الصحيح (لو مش موجود)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'staff', -- admin, staff, super_admin
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- إدخال بيانات الأدمن (لو مش موجود)
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
