import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const centerId = searchParams.get('centerId');

    if (!userId || !centerId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data: perms, error } = await supabaseAdmin
      .from('staff_permissions')
      .select('permission_key')
      .eq('staff_id', userId)
      .eq('center_id', centerId);

    if (error) throw error;

    return NextResponse.json({ permissions: perms.map(p => p.permission_key) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
