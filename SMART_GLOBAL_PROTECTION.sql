-- 🛡️ الدرع الشامل الذكي (بيفحص الجداول الموجودة الأول)
-- السكريبت ده هيلف على كل الجداول اللي تهمنا، ولو لقاها موجودة هيطبق عليها حماية "المسجلين فقط"

DO $$ 
DECLARE 
    tbl text;
    -- قائمة بكل الجداول المحتملة في مشروعك
    tables_to_check text[] := ARRAY[
        'centers', 'staff_profiles', 'instructors', 'courses', 
        'groups', 'students', 'schedule', 'exams', 
        'exam_results', 'settings', 'attendance', 'session_attendance', 
        'rooms', 'audit_logs', 'sessions'
    ];
BEGIN 
    FOREACH tbl IN ARRAY tables_to_check LOOP
        -- التأكد إن الجدول موجود فعلاً في الداتابيز قبل ما نلمسه
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl
        ) THEN
            -- 1. تفعيل الـ RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            
            -- 2. مسح السياسات القديمة عشان ميكونش في أي تعارض
            -- بنمسح كل السياسات اللي ممكن نكون عملناها قبل كدة
            EXECUTE format('DROP POLICY IF EXISTS "Global Auth Access" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Exams access policy" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Simple Auth Access for Exams" ON public.%I', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Simple Auth Access for Exam Results" ON public.%I', tbl);
            
            -- 3. وضع السياسة الذهبية: "مسموح فقط للمسجلين دخول"
            EXECUTE format('CREATE POLICY "Global Auth Access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
            
            RAISE NOTICE '✅ تم تأمين الجدول: %', tbl;
        ELSE
            RAISE NOTICE '⚪ الجدول غير موجود، تم التخطي: %', tbl;
        END IF;
    END LOOP;
END $$;
