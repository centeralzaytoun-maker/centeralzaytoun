import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, unique_id, enrolled_courses, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- Recent Students ---');
  data.forEach(s => {
    console.log(`Name: ${s.name} | ID: ${s.id} | UniqueID: ${s.unique_id}`);
    console.log(`Enrolled Courses: ${JSON.stringify(s.enrolled_courses)}`);
    console.log(`Is Active: ${s.is_active} | Created At: ${s.created_at}`);
    console.log('------------------------');
  });
}

checkRecentStudents();
