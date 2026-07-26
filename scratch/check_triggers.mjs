import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qngdkkhnvkvgskfxnerh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0'
);

async function checkTriggers() {
  const { data, error } = await supabase.rpc('exec', { sql: "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'students';" });
  if (error) {
    console.error(error);
  } else {
    console.log('Triggers:', data);
  }
}

checkTriggers();
