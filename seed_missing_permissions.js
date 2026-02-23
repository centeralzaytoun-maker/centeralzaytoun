const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qngdkkhnvkvgskfxnerh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPermissions() {
    const missingPermissions = [
        { key: 'dashboard:staff', name: 'لوحة تحكم الموظفين (Sidebar)', description: 'ظهور رابط لوحة الموظفين في القائمة الجانبية' },
        { key: 'dashboard:admin', name: 'لوحة تحكم الإدارة (Sidebar)', description: 'ظهور رابط لوحة الإدارة في القائمة الجانبية' },
        { key: 'lessons:view', name: 'عرض المحتوى الرقمي', description: 'الوصول لصفحة المحتوى الرقمي والفيديوهات' },
        { key: 'vouchers:view', name: 'عرض أكواد الشحن', description: 'الوصول لصفحة توليد وإدارة أكواد الشحن' },
        { key: 'super_admin:access', name: 'دخول القيادة العليا', description: 'صلاحية الوصول التقني للوحة السوبر أدمن' }
    ];

    console.log('--- Seeding Missing Permissions ---');

    for (const perm of missingPermissions) {
        const { error } = await supabase.from('permissions').upsert(perm, { onConflict: 'key' });
        if (error) {
            console.error(`❌ Error seeding ${perm.key}:`, error.message);
        } else {
            console.log(`✅ Permission seeded: ${perm.key}`);
        }
    }

    console.log('🚀 SUCCESS: All missing sidebar permissions seeded!');
}

seedPermissions();
