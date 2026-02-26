import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client to bypass RLS for pre-login lookup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qngdkkhnvkvgskfxnerh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uniqueId = searchParams.get('uniqueId');

    if (!uniqueId) {
      return NextResponse.json({ error: 'Unique ID is required' }, { status: 400 });
    }

    // Lookup student(s) with this ID across all centers
    const { data: students, error } = await supabaseAdmin
      .from('students')
      .select('center_id, name, centers(name)')
      .ilike('unique_id', uniqueId.trim());

    if (error) {
      console.error('Lookup Error:', error);
      return NextResponse.json({ error: 'Failed to lookup student' }, { status: 500 });
    }

    // Format the response
    const results = students.map(s => ({
      center_id: s.center_id,
      center_name: s.centers?.name || 'Unknown Center',
      student_name: s.name
    }));

    return NextResponse.json({ students: results });

  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
