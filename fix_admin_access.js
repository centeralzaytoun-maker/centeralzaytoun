const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qngdkkhnvkvgskfxnerh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    console.log('--- Starting Admin Access Recovery ---');

    // 1. Seed the critical feature
    const { error: fErr } = await supabase.from('features').upsert({
        id: 'page_super_admin',
        name: 'لوحة القيادة العليا (Super Admin)',
        description: 'الوصول لإدارة المنصة، الباقات، والتحكم الكلي في السناتر'
    });
    if (fErr) console.error('Feature seed error:', fErr);
    else console.log('✅ Feature "page_super_admin" seeded.');

    // 2. Find or Create "Super Admin Package"
    let { data: pkg } = await supabase.from('packages').select('*').eq('name', 'Super Admin Package').single();
    if (!pkg) {
        const { data: newPkg, error: pErr } = await supabase.from('packages').insert({
            name: 'Super Admin Package',
            price: 0,
            duration_days: 3650,
            is_active: true
        }).select().single();
        if (pErr) { console.error('Package create error:', pErr); return; }
        pkg = newPkg;
        console.log('✅ "Super Admin Package" created.');
    } else {
        console.log('ℹ️ "Super Admin Package" already exists.');
    }

    // 3. Link feature to package
    const { error: linkErr } = await supabase.from('package_features').upsert({
        package_id: pkg.id,
        feature_id: 'page_super_admin'
    });
    if (linkErr) console.error('Linking error:', linkErr);
    else console.log('✅ Linked "page_super_admin" to package.');

    // 4. Update "Default Center"
    const { data: center } = await supabase.from('centers').select('*').eq('name', 'Default Center').single();
    if (center) {
        const { error: uErr } = await supabase.from('centers').update({
            package_id: pkg.id,
            subscription_end_date: new Date('2030-01-01').toISOString(),
            is_active: true
        }).eq('id', center.id);
        if (uErr) console.error('Center update error:', uErr);
        else console.log('🚀 SUCCESS: Default Center is now SUPER ADMIN activated!');
    } else {
        console.log('❌ CSS error: "Default Center" not found by name.');
    }
}

fix();
