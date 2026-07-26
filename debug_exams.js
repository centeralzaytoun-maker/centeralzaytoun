const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkExamsTable() {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching exams:', error);
  } else {
    console.log('Exams table columns:', Object.keys(data[0] || {}));
  }

  const { data: qBank, error: qError } = await supabase
    .from('question_bank')
    .select('*')
    .limit(1);
  
  if (qError) {
    console.log('question_bank table does not exist or error:', qError.message);
  } else {
    console.log('question_bank table exists');
  }
}

checkExamsTable();
