const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkQuestionBankColumns() {
  const { data, error } = await supabase
    .from('question_bank')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching question_bank:', error);
  } else {
    console.log('question_bank table columns:', Object.keys(data[0] || {}));
  }
}

checkQuestionBankColumns();
