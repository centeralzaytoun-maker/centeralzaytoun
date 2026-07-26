import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Fetch all features
  const { data: features, error: featuresError } = await supabase.from('features').select('*');
  if (featuresError) { console.error('Error features:', featuresError); return; }
  console.log(`Found ${features?.length} features.`);

  // Upsert to permissions
  const permissionsToInsert = features.map(f => ({
      key: f.id,
      name: f.name,
      description: f.description
  }));
  
  if (permissionsToInsert.length > 0) {
      const { error: permError } = await supabase.from('permissions').upsert(permissionsToInsert);
      if (permError) { console.error('Error upserting permissions:', permError); return; }
      console.log('Successfully synced features to permissions!');
  } else {
      console.log('No features to sync.');
  }
}
run();
