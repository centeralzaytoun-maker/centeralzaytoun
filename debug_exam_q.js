const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkExamQuestions() {
  const { data, error } = await supabase
    .from('exam_questions')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('exam_questions table does not exist:', error.message);
  } else {
    console.log('exam_questions table columns:', Object.keys(data[0] || {}));
  }
}

checkExamQuestions();
