
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qngdkkhnvkvgskfxnerh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0');

async function testAnon() {
  // Using anon key (actually service role key here, let me get the anon key from lib/supabase)
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzMwNzMsImV4cCI6MjA4NDMwOTA3M30.4uV_2-5G0vL-5Z0M7N-X2N-N-N-N-N-N-N-N-N-N'; // This is a placeholder, I should get it from the project
}
