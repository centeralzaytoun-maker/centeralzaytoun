import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qngdkkhnvkvgskfxnerh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0'
);

async function checkTable() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  }
}

checkTable();
