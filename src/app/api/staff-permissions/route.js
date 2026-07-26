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
    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get('center_id');

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

    console.log('🔍 API Debug - centerId:', centerId);

    // جلب البيانات بالتوازي مع الفلترة حسب المركز
    const [staffResult, permissionsResult, staffPermissionsResult] = await Promise.all([
      supabase.from('staff_profiles').select('*').eq('center_id', centerId).order('created_at', { ascending: false }),
      supabase.from('permissions').select('key, name'), 
      supabase.from('staff_permissions').select('staff_id, permission_key').eq('center_id', centerId)
    ]);

    console.log('🔍 API Debug - Staff query result:', {
      count: staffResult.data?.length || 0,
      error: staffResult.error,
      data: staffResult.data?.slice(0, 2) // Show first 2 staff members for debugging
    });

    if (staffResult.error) throw new Error(`Staff Error: ${staffResult.error.message}`);
    if (permissionsResult.error) throw new Error(`Permissions Error: ${permissionsResult.error.message}`);
    if (staffPermissionsResult.error) throw new Error(`Staff Perms Error: ${staffPermissionsResult.error.message}`);

    return NextResponse.json({
      staff: staffResult.data || [],
      permissions: permissionsResult.data || [],
      staffPermissions: staffPermissionsResult.data || []
    });

  } catch (error) {
    console.error('API Error:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { staff_id, permissions, center_id } = body;

    if (!staff_id || !Array.isArray(permissions) || !center_id) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // 1. حذف كل الصلاحيات القديمة للموظف في هذا المركز تحديداً
    const { error: delError } = await supabase
      .from('staff_permissions')
      .delete()
      .eq('staff_id', staff_id)
      .eq('center_id', center_id);

    if (delError) throw new Error(delError.message);

    // 2. إضافة الصلاحيات الجديدة
    if (permissions.length > 0) {
      const rows = permissions.map(key => ({
        staff_id,
        permission_key: key,
        center_id // التأكيد على المركز
      }));

      const { error: insError } = await supabase
        .from('staff_permissions')
        .insert(rows);

      if (insError) throw new Error(insError.message);
    }

    return NextResponse.json({ success: true, message: 'تم تحديث الصلاحيات بنجاح' });

  } catch (e) {
    console.error('Update Permissions Error:', e);
    console.error('Stack:', e.stack);
    return NextResponse.json({ 
      error: 'Failed to update permissions',
      details: e.message 
    }, { status: 500 });
  }
}
