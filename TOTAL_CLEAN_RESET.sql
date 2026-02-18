-- 🚨 سكريبت التنظيف الكامل (إلغاء كل السياسات وفتح الجداول) 🚨
-- السكريبت ده هيرجع الداتابيز لحالتها الأصلية تماماً:
-- 1. هيمسح كل الـ Policies اللي اتعملت لشؤون الأمان.
-- 2. هيقفل الـ Row Level Security (RLS) على كل الجداول.

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
        -- 1. مسح "كل" السياسات اللي موجودة على الجدول أياً كان اسمها
        EXECUTE (
            SELECT coalesce(string_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tbl), '; '), 'SELECT 1')
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tbl
        );
        
        -- 2. إغلاق الـ RLS تماماً عشان الجداول تبقى مفتوحة زي الأول
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
        
        RAISE NOTICE '✅ تم تنظيف وإعادة فتح جدول: %', tbl;
    END LOOP;
END $$;
