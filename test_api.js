// Simple test for the staff-permissions API
const testCenterId = 'cad7713d-6281-4968-a6fb-95acc7a9a4ca';

async function testAPI() {
  console.log('🧪 Testing staff-permissions API...');
  
  try {
    // Test GET endpoint
    console.log('\n1️⃣ Testing GET endpoint...');
    const response = await fetch(`http://localhost:3000/api/staff-permissions?center_id=${testCenterId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ GET request successful!');
      console.log(`   - Staff members: ${data.staff?.length || 0}`);
      console.log(`   - Permissions: ${data.permissions?.length || 0}`);
      console.log(`   - Staff permissions: ${data.staffPermissions?.length || 0}`);
      
      // Show sample data
      if (data.staff && data.staff.length > 0) {
        console.log('\n📋 Sample staff members:');
        data.staff.slice(0, 3).forEach(staff => {
          console.log(`   - ${staff.full_name} (${staff.role})`);
        });
      }
      
      if (data.permissions && data.permissions.length > 0) {
        console.log('\n📋 Sample permissions:');
        data.permissions.slice(0, 5).forEach(perm => {
          console.log(`   - ${perm.key}: ${perm.name}`);
        });
      }
      
    } else {
      console.log('❌ GET request failed');
      console.log('Status:', response.status);
      const errorData = await response.json().catch(() => ({}));
      console.log('Error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPI();
