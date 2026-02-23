const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qngdkkhnvkvgskfxnerh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: centers } = await supabase.from('centers').select('id, name');
    console.log('--- Centers ---');
    console.log(centers);

    const { data: staff } = await supabase.from('staff_profiles').select('*');
    console.log('--- Staff Profiles ---');
    console.log(staff);
}

run();
