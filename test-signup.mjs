import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  const randomEmail = `test_${Date.now()}@example.com`;
  console.log(`Attempting signup with email: ${randomEmail}`);
  
  const { data, error } = await supabase.auth.signUp({
    email: randomEmail,
    password: 'password123',
    options: {
      data: {
        full_name: 'Test Admin',
        role: 'admin',
      }
    }
  });

  if (error) {
    console.error("Signup failed:", error.status, error.name, error.message);
  } else {
    console.log("Signup succeeded! User ID:", data.user?.id);
  }
}

testSignup();
