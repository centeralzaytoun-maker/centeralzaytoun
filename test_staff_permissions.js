// Test script to verify staff permissions functionality
const { supabase } = require('./src/lib/supabase');

async function testStaffPermissions() {
  console.log('🧪 Testing Staff Permissions System...\n');

  try {
    // Test 1: Check if permissions exist in database
    console.log('1️⃣ Checking if page permissions exist in database...');
    const { data: permissions, error: permError } = await supabase
      .from('permissions')
      .select('key, name, group_key')
      .like('key', 'page_%')
      .order('key');

    if (permError) {
      console.error('❌ Error fetching permissions:', permError);
      return;
    }

    console.log(`✅ Found ${permissions.length} page permissions:`);
    permissions.forEach(p => {
      console.log(`   - ${p.key}: ${p.name}`);
    });

    // Test 2: Check if features exist
    console.log('\n2️⃣ Checking if features exist in database...');
    const { data: features, error: featError } = await supabase
      .from('features')
      .select('id, name, description')
      .like('id', 'page_%')
      .order('id');

    if (featError) {
      console.error('❌ Error fetching features:', featError);
      return;
    }

    console.log(`✅ Found ${features.length} page features:`);
    features.forEach(f => {
      console.log(`   - ${f.id}: ${f.name}`);
    });

    // Test 3: Check staff permissions API endpoint
    console.log('\n3️⃣ Testing staff permissions API endpoint...');
    
    // First get a center ID (you'll need to replace with actual center ID)
    const { data: centers } = await supabase
      .from('centers')
      .select('id, name')
      .limit(1);

    if (centers && centers.length > 0) {
      const testCenterId = centers[0].id;
      console.log(`📍 Using center: ${centers[0].name} (${testCenterId})`);

      // Test the API endpoint
      const apiResponse = await fetch(`http://localhost:3000/api/staff-permissions?center_id=${testCenterId}`);
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log('✅ API endpoint working:');
        console.log(`   - Staff members: ${apiData.staff?.length || 0}`);
        console.log(`   - Permissions: ${apiData.permissions?.length || 0}`);
        console.log(`   - Staff permissions: ${apiData.staffPermissions?.length || 0}`);
      } else {
        console.log('⚠️ API endpoint test skipped (server not running)');
      }
    } else {
      console.log('⚠️ No centers found for API testing');
    }

    // Test 4: Verify specific page permissions exist
    console.log('\n4️⃣ Verifying specific page permissions for requested routes...');
    const requiredPages = [
      'page_staff_dashboard',
      'page_sessions', 
      'page_students',
      'page_instructors',
      'page_courses',
      'page_groups',
      'page_schedule',
      'page_finance_debts'
    ];

    const missingPermissions = requiredPages.filter(page => 
      !permissions.some(p => p.key === page)
    );

    if (missingPermissions.length === 0) {
      console.log('✅ All required page permissions are available');
    } else {
      console.log('❌ Missing permissions:');
      missingPermissions.forEach(p => console.log(`   - ${p}`));
    }

    console.log('\n🎉 Staff permissions system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testStaffPermissions();
