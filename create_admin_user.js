const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qngdkkhnvkvgskfxnerh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function registerAdmin() {
    const userEmail = 'abdulkhaleq@center.com';
    const userPassword = 'password: 245163'; // Note: password is handled by Auth, but we need the UUID
    const targetCenterId = '00000000-0000-0000-0000-000000000001'; // Default Center

    console.log(`--- Registering ${userEmail} to Default Center ---`);

    // 1. Create User in Auth (if not exists)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: userPassword,
        email_confirm: true
    });

    let userId;
    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('ℹ️ User already exists in Auth, fetching UID...');
            // Need to fetch user id by email from a safe way or just let it fail and try update
            const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
            const existingUser = listData.users.find(u => u.email === userEmail);
            if (existingUser) userId = existingUser.id;
        } else {
            console.error('❌ Auth Error:', authError.message);
            return;
        }
    } else {
        userId = authUser.user.id;
        console.log('✅ User created in Auth.');
    }

    if (!userId) {
        console.error('❌ Could not retrieve User ID.');
        return;
    }

    // 2. Insert into staff_profiles
    const { error: profileError } = await supabase.from('staff_profiles').upsert({
        id: userId,
        email: userEmail,
        full_name: 'عبد الخالق (مدير المنصة)',
        role: 'admin',
        center_id: targetCenterId
    });

    if (profileError) {
        console.error('❌ Profile Error:', profileError.message);
    } else {
        console.log('🚀 SUCCESS: Admin profile created and linked to Default Center!');
    }
}

registerAdmin();
