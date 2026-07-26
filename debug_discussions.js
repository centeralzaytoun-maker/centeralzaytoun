const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkDiscussions() {
  const { data, error } = await supabase
    .from('lesson_discussions')
    .select('id, center_id, is_resolved, parent_id');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total discussions:', data.length);
  console.log('Unresolved main questions:', data.filter(d => !d.is_resolved && !d.parent_id).length);
  console.log('Data sample:', data);
}

checkDiscussions();
