
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qngdkkhnvkvgskfxnerh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0');

async function check() {
  const { data: staff, error } = await supabase.from('staff_profiles').select('id, full_name, role, center_id').limit(10);
  if (error) return console.error(error);
  console.log('Staff profiles:', JSON.stringify(staff, null, 2));

  for (const s of staff || []) {
    const { data: perms } = await supabase.from('staff_permissions').select('permission_key').eq('staff_id', s.id).eq('center_id', s.center_id);
    console.log(`Permissions for ${s.full_name} (${s.id}) in center ${s.center_id}:`, perms?.map(p => p.permission_key));
  }
}
check();
