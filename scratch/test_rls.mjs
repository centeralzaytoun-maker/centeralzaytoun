
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qngdkkhnvkvgskfxnerh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0');

async function testRLS() {
  // Waleed's ID: a7e9cf56-35fe-4190-91cf-d07815df14db
  // Waleed's center: afda26e2-b06a-4766-811e-3fcb8c8db781
  
  const userId = 'a7e9cf56-35fe-4190-91cf-d07815df14db';
  const centerId = 'afda26e2-b06a-4766-811e-3fcb8c8db781';

  // Using service role to check what's actually there
  const { data: realData } = await supabase.from('staff_permissions').select('permission_key').eq('staff_id', userId).eq('center_id', centerId);
  console.log('Real data (Service Role):', realData?.length, 'rows');

  // Now simulate the browser by creating a client with the same user session
  // (We can't easily sign in as them, but we can check if the table has RLS enabled)
  const { data: rlsStatus } = await supabase.rpc('get_policies_for_table', { table_name: 'staff_permissions' });
  console.log('RLS Status:', rlsStatus);
}
testRLS();
