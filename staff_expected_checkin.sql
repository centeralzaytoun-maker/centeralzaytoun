-- ════════════════════════════════════════════════════
-- إضافة وقت الحضور المتوقع لكل موظف
-- شغّل هذا الـ SQL في Supabase SQL Editor
-- ════════════════════════════════════════════════════

-- 1. نضيف العمودين على جدول staff_profiles
ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS expected_check_in  TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS late_tolerance_min INTEGER DEFAULT 15;
-- expected_check_in: الوقت المتوقع للحضور (مثال: 09:00)
-- late_tolerance_min: هامش التسامح بالدقائق قبل تسجيل "تأخير" (افتراضي 15 دقيقة)
