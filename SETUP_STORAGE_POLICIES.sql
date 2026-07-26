-- 1. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- 3. Create new policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'center-logos' );
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'center-logos' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'center-logos' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'center-logos' AND auth.role() = 'authenticated' );
