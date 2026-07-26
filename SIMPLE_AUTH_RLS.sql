-- 🛡️ أبسط وأسرع حماية (للمسجلين فقط)
-- ده بيضمن إن أي حد "مسجل دخول" بس هو اللي يقدر يتعامل مع الجداول دي
-- وفي نفس الوقت بيقفل الباب تماماً قدام أي حد مجهول (Anonymous)

-- 1. جدول الامتحانات (exams)
DROP POLICY IF EXISTS "Exams access policy" ON exams;
DROP POLICY IF EXISTS "Exams are manageable by center staff" ON exams;
DROP POLICY IF EXISTS "Exams are viewable by center members" ON exams;

CREATE POLICY "Simple Auth Access for Exams"
ON exams
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. جدول نتائج الامتحانات (exam_results)
DROP POLICY IF EXISTS "Exam results access policy" ON exam_results;
DROP POLICY IF EXISTS "Exam results are manageable by center staff" ON exam_results;
DROP POLICY IF EXISTS "Exam results are viewable by center members" ON exam_results;
DROP POLICY IF EXISTS "Students can view their own results" ON exam_results;

CREATE POLICY "Simple Auth Access for Exam Results"
ON exam_results
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. تأكد إن الـ RLS مفعل (لكن بالسياسة الجديدة البسيطة)
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
