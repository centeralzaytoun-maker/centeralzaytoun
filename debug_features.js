const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkCenterFeatures() {
  const { data: center, error } = await supabase
    .from('centers')
    .select(`
      id, 
      name, 
      is_active, 
      packages (
        name,
        package_features ( feature_id )
      )
    `)
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Center:', center.name);
  console.log('Features:', center.packages?.package_features.map(f => f.feature_id));
}

checkCenterFeatures();
