-- ============================================================
-- SMART CENTER - إعداد الداتابيز الجديدة
-- شغّل الملف ده في Supabase > SQL Editor
-- ============================================================


-- ============================================================
-- STEP 1: إضافة الباقات الافتراضية
-- (الداتابيز الجديدة فيها Schema بس مفيهاش Data)
-- ============================================================

INSERT INTO public.packages (id, name, price, duration_days, max_students, max_staff, is_active)
VALUES
  (gen_random_uuid(), 'تجريبي مجاني',     0,    14,  50,   5,  true),
  (gen_random_uuid(), 'الباقة الأساسية',  299,  180, 300,  10, true),
  (gen_random_uuid(), 'الباقة المتقدمة',  499,  365, 1000, 30, true),
  (gen_random_uuid(), 'باقة المؤسسات',    999,  365, NULL, NULL, true)
ON CONFLICT DO NOTHING;


-- ============================================================
-- STEP 2: إضافة الـ Features الافتراضية
-- ============================================================

INSERT INTO public.features (id, name, description)
VALUES
  ('sessions',    'الحصص',           'إدارة الحصص والحضور'),
  ('finance',     'المالية',          'إدارة المدفوعات والمصاريف'),
  ('students',    'الطلاب',           'إدارة بيانات الطلاب'),
  ('exams',       'الامتحانات',       'إنشاء وإدارة الامتحانات'),
  ('store',       'المتجر',           'متجر المستلزمات'),
  ('lms',         'التعلم الإلكتروني', 'منصة التعلم أونلاين'),
  ('reports',     'التقارير',         'التقارير والإحصائيات'),
  ('staff',       'الموظفين',         'إدارة الموظفين'),
  ('schedule',    'الجداول',          'جدولة المجموعات والغرف'),
  ('discussions', 'النقاشات',         'نقاشات الدروس'),
  ('support',     'الدعم',            'تذاكر الدعم الفني')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- STEP 3: إضافة الـ Permissions الافتراضية
-- ============================================================

INSERT INTO public.permissions (key, name, description)
VALUES
  ('manage_students',   'إدارة الطلاب',       'إضافة وتعديل وحذف الطلاب'),
  ('manage_sessions',   'إدارة الحصص',        'إنشاء وإدارة الحصص'),
  ('manage_courses',    'إدارة الكورسات',      'إضافة وتعديل الكورسات'),
  ('manage_exams',      'إدارة الامتحانات',    'إنشاء وتصحيح الامتحانات'),
  ('manage_store',      'إدارة المتجر',        'إدارة المنتجات والمبيعات'),
  ('manage_expenses',   'إدارة المصاريف',      'إضافة ومراجعة المصاريف'),
  ('manage_staff',      'إدارة الموظفين',      'إضافة وإدارة الموظفين'),
  ('view_reports',      'عرض التقارير',        'الوصول لتقارير النظام'),
  ('manage_schedule',   'إدارة الجداول',       'إدارة جداول المجموعات'),
  ('send_notifications','إرسال الإشعارات',     'إرسال رسائل للطلاب'),
  ('manage_settings',   'إدارة الإعدادات',     'تعديل إعدادات النظام')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- STEP 3.5: Functions for RLS (Security Definer) to avoid infinite recursion
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_auth_user_centers()
RETURNS TABLE(center_id uuid)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT id FROM centers WHERE owner_id = auth.uid()
    UNION
    SELECT sp.center_id FROM staff_profiles sp WHERE sp.id = auth.uid();
END;
$$;

-- ============================================================
-- STEP 4: RLS Policies - السماح بإنشاء سنتر جديد
-- ============================================================

-- تفعيل RLS على الجداول المطلوبة
ALTER TABLE public.centers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_settings ENABLE ROW LEVEL SECURITY;

-- ---- centers ----
DROP POLICY IF EXISTS "allow_insert_own_center"   ON public.centers;
DROP POLICY IF EXISTS "allow_select_own_center"   ON public.centers;
DROP POLICY IF EXISTS "allow_update_own_center"   ON public.centers;

CREATE POLICY "allow_insert_own_center" ON public.centers
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "allow_select_own_center" ON public.centers
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT center_id FROM public.get_auth_user_centers())
  );

CREATE POLICY "allow_update_own_center" ON public.centers
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT center_id FROM public.get_auth_user_centers())
  );

-- ---- staff_profiles ----
DROP POLICY IF EXISTS "allow_insert_own_profile"  ON public.staff_profiles;
DROP POLICY IF EXISTS "allow_select_center_staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "allow_update_own_profile"  ON public.staff_profiles;

CREATE POLICY "allow_insert_own_profile" ON public.staff_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_select_center_staff" ON public.staff_profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR center_id IN (SELECT center_id FROM public.get_auth_user_centers())
  );

CREATE POLICY "allow_update_own_profile" ON public.staff_profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ---- center_settings ----
DROP POLICY IF EXISTS "allow_manage_center_settings" ON public.center_settings;

CREATE POLICY "allow_manage_center_settings" ON public.center_settings
  FOR ALL
  USING (
    center_id IN (SELECT center_id FROM public.get_auth_user_centers())
  );

-- ---- packages: القراءة مسموح للجميع (حتى غير المسجلين) ----
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_packages" ON public.packages;

CREATE POLICY "allow_read_packages" ON public.packages
  FOR SELECT
  USING (is_active = true);

-- ---- features ----
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_features" ON public.features;

CREATE POLICY "allow_read_features" ON public.features
  FOR SELECT USING (true);

-- ---- permissions ----
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_permissions" ON public.permissions;

CREATE POLICY "allow_read_permissions" ON public.permissions
  FOR SELECT USING (true);


-- ============================================================
-- STEP 5: باقي الجداول - policies أساسية
-- ============================================================

ALTER TABLE public.students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms             ENABLE ROW LEVEL SECURITY;

-- Policy عامة: كل موظف في المركز يشوف ويعدل بيانات مركزه
DO $outer$
DECLARE
  t text;
  has_col boolean;
  tables text[] := ARRAY[
    'students','courses','groups','sessions','instructors',
    'expenses','exams','notifications','staff_permissions',
    'rooms','schedule','question_bank','exam_questions',
    'exam_results','exam_submissions','store_products',
    'store_sales','store_settlements','store_returns',
    'store_audit_logs','audit_logs','recharge_codes',
    'student_lesson_access','student_chapter_access',
    'student_lesson_progress','student_online_enrollments',
    'student_subscriptions','student_payment_transactions',
    'student_exam_submissions','student_exam_answers',
    'student_activities','student_activity_logs',
    'lesson_comments','lesson_discussions','wallet_transactions',
    'notification_views','support_tickets','chat_messages',
    'system_logs','universal_inbox','lesson_chapters','lessons',
    'staff_attendance','staff_schedules','educational_stages',
    'student_device_tokens','parent_device_tokens'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'center_id'
    ) INTO has_col;

    IF has_col THEN
      -- تفعيل RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- حذف policy قديمة لو موجودة
      EXECUTE format('DROP POLICY IF EXISTS "center_staff_access" ON public.%I', t);

      -- إنشاء policy جديدة
      EXECUTE format(
        'CREATE POLICY "center_staff_access" ON public.%I ' ||
        'FOR ALL ' ||
        'USING ( ' ||
        '  center_id IN (SELECT center_id FROM public.get_auth_user_centers()) ' ||
        ')',
        t
      );
    ELSE
      RAISE NOTICE 'Table % does not have center_id, skipping generic policy', t;
    END IF;
  END LOOP;
END $outer$;


-- ============================================================
-- تحقق: عدد الباقات الموجودة
-- ============================================================
SELECT name, price, duration_days, max_students FROM public.packages ORDER BY price;
