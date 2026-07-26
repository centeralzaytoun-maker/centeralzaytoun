-- ════════════════════════════════════════════════════════
-- جدول الجدول الأسبوعي للموظفين (Weekly Schedule)
-- شغّل هذا الـ SQL في Supabase SQL Editor
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS staff_schedules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id          UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  staff_id           UUID NOT NULL,          -- auth.users(id)
  day_of_week        SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- 0=الأحد  1=الاثنين  2=الثلاثاء  3=الأربعاء
  -- 4=الخميس  5=الجمعة  6=السبت
  expected_check_in  TIME,                   -- NULL لو يوم إجازة
  late_tolerance_min INTEGER DEFAULT 15,     -- هامش التسامح بالدقائق
  is_day_off         BOOLEAN DEFAULT FALSE,  -- يوم إجازة؟
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now(),

  UNIQUE (center_id, staff_id, day_of_week)  -- سجل واحد لكل يوم لكل موظف
);

-- Index للأداء
CREATE INDEX IF NOT EXISTS idx_staff_schedules_lookup
  ON staff_schedules(center_id, staff_id, day_of_week);

-- RLS
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

-- الأدمن يشوف ويعدل جداول مركزه
CREATE POLICY "admin_manage_schedules" ON staff_schedules
  FOR ALL
  USING (
    center_id IN (
      SELECT c.id FROM centers c WHERE c.owner_id = auth.uid()
      UNION
      SELECT sp.center_id FROM staff_profiles sp
        WHERE sp.id = auth.uid() AND sp.role IN ('admin', 'manager', 'owner')
    )
  );

-- الموظف يشوف جدوله فقط
CREATE POLICY "staff_view_own_schedule" ON staff_schedules
  FOR SELECT
  USING (auth.uid() = staff_id);
