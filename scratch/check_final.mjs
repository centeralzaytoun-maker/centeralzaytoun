
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qngdkkhnvkvgskfxnerh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0');

async function checkFinal() {
  const userId = 'a7e9cf56-35fe-4190-91cf-d07815df14db';
  const { data: perms } = await supabase.from('staff_permissions').select('permission_key, center_id').eq('staff_id', userId);
  console.log('All perms for Waleed:', JSON.stringify(perms, null, 2));
}
checkFinal();
