import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Fetching centers...");
  const { data: centersData, error: centersError } = await supabase.from('centers').select('*');
  console.log("Centers Error:", centersError);

  console.log("Fetching staff_profiles...");
  const { data: staffData, error: staffError } = await supabase.from('staff_profiles').select('center_id,role').eq('id', '0fcfdbf1-0216-4ccc-b654-19bf2cd86b88');
  console.log("Staff Error:", staffError);
  
  console.log("Fetching students...");
  const { data: studentsData, error: studentsError } = await supabase.from('students').select('center_id').eq('id', '0fcfdbf1-0216-4ccc-b654-19bf2cd86b88');
  console.log("Students Error:", studentsError);
}

test();
