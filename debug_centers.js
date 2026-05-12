// Debug script to check centers and staff
const { supabase } = require('./src/lib/supabase');

async function debugCentersAndStaff() {
  console.log('🔍 Debugging centers and staff...\n');

  try {
    // 1. Check all centers
    console.log('1️⃣ Checking all centers...');
    const { data: centers, error: centerError } = await supabase
      .from('centers')
      .select('id, name, domain');

    if (centerError) {
      console.error('❌ Error fetching centers:', centerError);
      return;
    }

    console.log(`✅ Found ${centers.length} centers:`);
    centers.forEach(center => {
      console.log(`   - ${center.name} (${center.id})`);
    });

    // 2. Check all staff profiles
    console.log('\n2️⃣ Checking all staff profiles...');
    const { data: allStaff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id, full_name, role, center_id');

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError);
      return;
    }

    console.log(`✅ Found ${allStaff.length} staff members:`);
    allStaff.forEach(staff => {
      const centerName = centers.find(c => c.id === staff.center_id)?.name || 'Unknown Center';
      console.log(`   - ${staff.full_name} (${staff.role}) - ${centerName}`);
    });

    // 3. Check staff for the specific center
    const testCenterId = 'cad7713d-6281-4968-a6fb-95acc7a9a4ca';
    console.log(`\n3️⃣ Checking staff for center: ${testCenterId}`);
    
    const { data: centerStaff, error: centerStaffError } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('center_id', testCenterId);

    if (centerStaffError) {
      console.error('❌ Error fetching center staff:', centerStaffError);
    } else {
      console.log(`✅ Found ${centerStaff.length} staff members for this center:`);
      centerStaff.forEach(staff => {
        console.log(`   - ${staff.full_name} (${staff.role})`);
      });
    }

    // 4. Test API with different center if available
    if (centers.length > 0) {
      console.log(`\n4️⃣ Testing API with center: ${centers[0].name}`);
      const response = await fetch(`http://localhost:3000/api/staff-permissions?center_id=${centers[0].id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Test Results:');
        console.log(`   - Staff members: ${data.staff?.length || 0}`);
        console.log(`   - Permissions: ${data.permissions?.length || 0}`);
        console.log(`   - Staff permissions: ${data.staffPermissions?.length || 0}`);
      } else {
        console.log('❌ API test failed');
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugCentersAndStaff();
