-- ==========================================
-- FIX: RLS Policies for Student Portal
-- ==========================================

-- 1. Students Table: Allow students to view their own record
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
CREATE POLICY "Students can view their own profile" ON public.students
FOR SELECT USING (auth.uid() = id);

-- 2. Courses Table: Allow students to view courses in their center
DROP POLICY IF EXISTS "Students can view courses in their center" ON public.courses;
CREATE POLICY "Students can view courses in their center" ON public.courses
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM public.students WHERE id = auth.uid()
  )
);

-- 3. Lessons Table: Allow students to view lessons for courses in their center
DROP POLICY IF EXISTS "Students can view lessons in their center" ON public.lessons;
CREATE POLICY "Students can view lessons in their center" ON public.lessons
FOR SELECT USING (
  course_id IN (
    SELECT id FROM public.courses WHERE center_id IN (
      SELECT center_id FROM public.students WHERE id = auth.uid()
    )
  )
);

-- 4. Enrollments Table: Allow students to view their own enrollments
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.student_online_enrollments;
CREATE POLICY "Students can view their own enrollments" ON public.student_online_enrollments
FOR SELECT USING (student_id = auth.uid());

-- 4.1 Enrollments Table: Allow students to insert their own enrollments (for voucher use)
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.student_online_enrollments;
CREATE POLICY "Students can enroll themselves" ON public.student_online_enrollments
FOR INSERT WITH CHECK (student_id = auth.uid());

-- 5. Lesson Progress Table: Allow students to view and manage their own progress
DROP POLICY IF EXISTS "Students can manage their own progress" ON public.student_lesson_progress;
CREATE POLICY "Students can manage their own progress" ON public.student_lesson_progress
FOR ALL USING (student_id = auth.uid());

-- 6. Recharge Codes: Allow students to view codes (needed to check if valid)
DROP POLICY IF EXISTS "Students can view recharge codes" ON public.recharge_codes;
CREATE POLICY "Students can view recharge codes" ON public.recharge_codes
FOR SELECT USING (
  course_id IN (
    SELECT id FROM public.courses WHERE center_id IN (
      SELECT center_id FROM public.students WHERE id = auth.uid()
    )
  )
);

-- 6.1 Recharge Codes: Allow students to update codes when using them
DROP POLICY IF EXISTS "Students can use recharge codes" ON public.recharge_codes;
CREATE POLICY "Students can use recharge codes" ON public.recharge_codes
FOR UPDATE USING (
  !is_used AND course_id IN (
    SELECT id FROM public.courses WHERE center_id IN (
      SELECT center_id FROM public.students WHERE id = auth.uid()
    )
  )
) WITH CHECK (is_used = true AND used_by = auth.uid());

-- Ensure RLS is enabled on these tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_online_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_progress ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ Student Portal RLS Policies Applied Successfully';
