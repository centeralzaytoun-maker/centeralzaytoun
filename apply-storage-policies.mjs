import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    -- Enable RLS on storage.objects if not already enabled
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

    -- Create new policies
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'center-logos' );
    CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'center-logos' AND auth.role() = 'authenticated' );
    CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'center-logos' AND auth.role() = 'authenticated' );
    CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'center-logos' AND auth.role() = 'authenticated' );
  `;
  const { error } = await supabaseAdmin.rpc('exec', { sql });
  console.log(error || 'Storage policies updated');
}
run();
