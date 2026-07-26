-- 🛡️ سكريبت "الإنقاذ الشامل" - Safe Reset for All Tables
-- السكريبت ده هيلف على "كل" جداول قاعدة البيانات بدون استثناء 
-- ويخليها متاحة لأي حد مسجل دخول (Authenticated) فقط.
-- ده هيحل مشكلة الـ Auth Verification ومشكلة الـ Insert Exams فوراً.

DO $$ 
DECLARE 
    tbl text;
BEGIN 
    -- جلب كل الجداول الموجودة في الـ public schema
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        -- 1. تفعيل الـ RLS على الجدول لو مش مفعل
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        
        -- 2. مسح "كل" السياسات القديمة عشان ميحصلش أي تداخل أو Errors
        -- السكريبت هيمسح أي سياسة موجودة أياً كان اسمها
        EXECUTE (
            SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tbl), '; ')
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl
        );
        
        -- 3. وضع السياسة الموحدة (للمسجلين فقط - دخول كامل)
        EXECUTE format('CREATE POLICY "Universal_Authenticated_Access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
        
        RAISE NOTICE '✅ تم الانتهاء من تأمين وتنظيف جدول: %', tbl;
    END LOOP;
END $$;
