-- ================================================================
-- 🔴 تفعيل Supabase Realtime على جميع الجداول المطلوبة
-- شغّل هذا الـ SQL في: Supabase Dashboard > SQL Editor
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE instructors;
ALTER PUBLICATION supabase_realtime ADD TABLE courses;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- التحقق من الجداول المفعلة (للتأكيد)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
