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

    const cleanId = uniqueId.trim();
    
    // 🔍 Smart Lookup Strategy
    // 1. Try exact (case-insensitive)
    let { data: students, error } = await supabaseAdmin
      .from('students')
      .select('center_id, name, unique_id, centers(name)')
      .ilike('unique_id', cleanId)
      .limit(5);

    // 2. Fallback: If no match and starts with S, try without S or with S-
    if ((!students || students.length === 0) && cleanId.toUpperCase().startsWith('S')) {
       const numericPart = cleanId.substring(1).replace(/^-/, ''); // Remove S and leading dash
       const { data: fallbackStudents } = await supabaseAdmin
         .from('students')
         .select('center_id, name, unique_id, centers(name)')
         .or(`unique_id.ilike.S-${numericPart},unique_id.ilike.${numericPart}`)
         .limit(5);
       
       if (fallbackStudents?.length > 0) students = fallbackStudents;
    }

    if (error) {
      console.error('Lookup Error:', error);
      return NextResponse.json({ error: 'Failed to lookup student' }, { status: 500 });
    }

    // Format the response
    const results = (students || []).map(s => ({
      center_id: s.center_id,
      center_name: s.centers?.name || 'Unknown Center',
      student_name: s.name,
      matched_id: s.unique_id
    }));

    return NextResponse.json({ students: results });

  } catch (err) {
    console.error('CRITICAL LOOKUP ERROR:', err);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
