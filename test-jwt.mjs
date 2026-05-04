import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    CREATE OR REPLACE FUNCTION public.debug_my_jwt()
    RETURNS jsonb
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN auth.jwt();
    END;
    $$ LANGUAGE plpgsql;
  `;
  // Let's use the REST API to execute SQL if possible, or just skip it.
  // Wait, I can just check the `auth.users` table for this user's raw `raw_user_meta_data`.
  const { data } = await supabaseAdmin.auth.admin.getUserById('9b84c0ed-6b03-473b-bcd0-2e931875966b');
  console.log(data);
}
run();
