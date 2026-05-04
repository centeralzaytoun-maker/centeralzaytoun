import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: users, error } = await supabase.from('staff_profiles').select('id, name, email, role, center_id');
  if (error) { console.error('Error fetching users:', error); return; }
  
  console.log(`Found ${users.length} staff profiles:`);
  console.table(users);

  if (users.length > 0) {
      const centerId = users[0].center_id;
      if (centerId) {
          const { data: center } = await supabase.from('centers').select('name, package_id, is_active, subscription_end_date').eq('id', centerId).single();
          console.log('\nCenter Details:');
          console.table([center]);

          if (center?.package_id) {
              const { data: pkgFeatures } = await supabase.from('package_features').select('feature_id').eq('package_id', center.package_id);
              console.log(`\nFeatures for package ${center.package_id}:`, pkgFeatures?.map(f => f.feature_id));
          }
      }
  }
}
run();
