import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qngdkkhnvkvgskfxnerh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0'
);

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'students' });
  if (error) {
    // If rpc doesn't exist, try another way or just try to update
    console.error('RPC error (probably doesn\'t exist):', error.message);
    
    // Try to update a test student
    const testId = 'e0d0628c-c239-42c8-9f7a-11d853edd51c'; // From previous check
    const { data: updateData, error: updateError } = await supabase
      .from('students')
      .update({ is_free: true })
      .eq('id', testId)
      .select();
      
    if (updateError) {
      console.error('Update error:', updateError.message);
    } else {
      console.log('Update success:', updateData);
      // Revert
      await supabase.from('students').update({ is_free: false }).eq('id', testId);
    }
  } else {
    console.log('Policies:', data);
  }
}

checkPolicies();
