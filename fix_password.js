const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qngdkkhnvkvgskfxnerh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPassword() {
    const userEmail = 'abdulkhaleq@center.com';
    const finalPassword = '245163'; // The correct intended password

    console.log(`--- Fixing password for ${userEmail} ---`);

    // 1. Fetch user ID
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) { console.error('List error:', listError); return; }

    const user = listData.users.find(u => u.email === userEmail);
    if (!user) {
        console.error('❌ User not found.');
        return;
    }

    // 2. Update password
    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: finalPassword }
    );

    if (error) {
        console.error('❌ Update Error:', error.message);
    } else {
        console.log('🚀 SUCCESS: Password updated successfully to: ' + finalPassword);
    }
}

fixPassword();
