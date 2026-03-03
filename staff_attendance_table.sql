-- ══════════════════════════════════════════════════════════════
-- جدول الحضور والانصراف للموظفين (Production Ready v2)
-- شغّل هذا الـ SQL في Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_attendance (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id        UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL,          -- auth.users(id)
  staff_name       TEXT,

  -- ── التوقيتات ──
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in         TIMESTAMPTZ,
  check_out        TIMESTAMPTZ,
  duration_minutes INTEGER,               -- يُحسب تلقائياً عند الانصراف

  -- ── الحالة ──
  status TEXT CHECK (status IN (
    'present',   -- حاضر بشكل طبيعي
    'late',      -- تأخر عن وقت الدخول المحدد
    'auto_out',  -- انصراف تلقائي (نسي check-out)
    'modified'   -- تعديل يدوي من الإدارة
  )) DEFAULT 'present',

  -- ── منع التلاعب (Geolocation & Device) ──
  ip_address       TEXT,
  latitude         NUMERIC(10, 6),
  longitude        NUMERIC(10, 6),
  device_info      TEXT,                  -- User-Agent مختصر

  -- ── التعديل اليدوي (Admin Override) ──
  is_modified      BOOLEAN DEFAULT FALSE,
  modified_by      UUID,                  -- auth.users(id) للأدمن اللي عدّل
  modified_at      TIMESTAMPTZ,
  modification_reason TEXT,              -- سبب التعديل إجباري

  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes للأداء ──
CREATE INDEX IF NOT EXISTS idx_staff_att_center_date ON staff_attendance(center_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_att_staff_date  ON staff_attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_att_status      ON staff_attendance(center_id, status);

-- ── Row Level Security ──
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;

-- سياسة 1: الموظف يشوف ويضيف سجلاته الخاصة فقط
CREATE POLICY "staff_own_records" ON staff_attendance
  FOR ALL
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

-- سياسة 2: الأدمن يشوف ويعدل كل سجلات مركزه
-- (نستخدم center_admins أو centers table حسب schema بتاعك)
CREATE POLICY "admin_center_records" ON staff_attendance
  FOR ALL
  USING (
    center_id IN (
      SELECT c.id FROM centers c WHERE c.owner_id = auth.uid()
      UNION
      SELECT s.center_id FROM staff s 
        WHERE s.user_id = auth.uid() 
          AND s.role IN ('admin', 'manager')
    )
  );

-- ══════════════════════════════════════════════════════════════
-- Function: حساب مدة العمل تلقائياً عند الانصراف
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION calc_work_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out IS NOT NULL AND NEW.check_in IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_duration
  BEFORE UPDATE ON staff_attendance
  FOR EACH ROW EXECUTE FUNCTION calc_work_duration();

-- ══════════════════════════════════════════════════════════════
-- Function: Auto Check-out (شغّلها كـ Scheduled Function)
-- تشتغل كل يوم الساعة 3 الفجر
-- أي موظف مسجّل حضور بدون انصراف من يومين أو أكثر
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_checkout_missed()
RETURNS void AS $$
BEGIN
  UPDATE staff_attendance
  SET 
    check_out   = (date + INTERVAL '23 hours'),
    status      = 'auto_out',
    notes       = COALESCE(notes, '') || ' [تسجيل انصراف تلقائي - نسي الموظف]'
  WHERE 
    check_out IS NULL
    AND check_in IS NOT NULL
    AND date < CURRENT_DATE;  -- فقط السجلات اللي مش من اليوم
END;
$$ LANGUAGE plpgsql;
