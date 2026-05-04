import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS specialization VARCHAR(50);`;
  const { error } = await supabaseAdmin.rpc('exec', { sql });
  console.log(error || 'done');
}
run();
