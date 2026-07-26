import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test_1777845444181@example.com',
    password: 'password123'
  });
  if (error) { console.error('Auth Error:', error.message); return; }
  
  // To get the raw JWT we can decode the access_token
  const jwt = data.session.access_token;
  const parts = jwt.split('.');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  console.log(JSON.stringify(claims, null, 2));
}
run();
