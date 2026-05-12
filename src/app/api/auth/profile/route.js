import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create server-side client for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export async function GET(req) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user profile from staff_profiles
    const { data: profile, error: profileError } = await supabase
      .from('staff_profiles')
      .select('id, full_name, role, email, center_id, is_active')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      email: profile.email,
      center_id: profile.center_id,
      is_active: profile.is_active
    });

  } catch (error) {
    console.error('Profile API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
