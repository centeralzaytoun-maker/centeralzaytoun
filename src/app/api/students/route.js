import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Admin client for user creation
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

    const page = Number(searchParams.get('page') || 1);
    const pageSize = Number(searchParams.get('pageSize') || 50);
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade');
    const course = searchParams.get('course');
    const isFree = searchParams.get('isFree');
    const centerId = searchParams.get('centerId');

    // التحقق من وجود centerId
    if (!centerId) {
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      );
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = await createServerClient();

    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('center_id', centerId); // ← فلترة حسب المركز

    // 🔍 Search
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,parent_phone.ilike.%${search}%,unique_id.ilike.%${search}%`
      );
    }

    // 🎓 Grade filter
    if (grade) {
  query = query.ilike('grade', `%${grade}%`);
}


    // 🎁 Free filter (Exempt students)
    if (isFree === 'true') {
      query = query.eq('is_free', true);
    }

    // 📚 Course filter
    if (course) {
      query = query.contains('enrolled_courses', [course]);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      students: data || [],
      totalCount: count || 0,
    });

  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const studentData = await req.json();
    
    console.log('Received student data in API:', studentData);
    
    if (!studentData.center_id) {
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      );
    }

    // 🛡️ Enforcement: Check Student Limit (max_students)
    const { data: centerData } = await supabaseAdmin
      .from('centers')
      .select('package_id, packages(max_students)')
      .eq('id', studentData.center_id)
      .single();

    if (centerData?.packages?.max_students) {
      const { count } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', studentData.center_id);

      if (count >= centerData.packages.max_students) {
        return NextResponse.json(
          { error: `عذراً، لقد وصل المركز للحد الأقصى من الطلاب المسموح به في الباقة الحالية (${centerData.packages.max_students} طالب).` },
          { status: 403 }
        );
      }
    }

    // 🎯 Generate Sequential Unique ID — Per-Prefix Independent Counter
    let uniqueId = null;
    let wasAdjusted = false;

    // Fetch center settings for start number and global prefix fallback
    const { data: settings } = await supabaseAdmin
      .from('center_settings')
      .select('next_student_code, student_code_prefix')
      .eq('center_id', studentData.center_id)
      .maybeSingle();

    // 🎯 Priority: grade-specific prefix sent from Frontend, else global prefix from settings
    const prefix = studentData.grade_prefix ?? settings?.student_code_prefix ?? null;

    // رقم البداية من الإعدادات (الحد الأدنى) أو 1 كافتراضي
    const startNumber = settings?.next_student_code || 1;

    // 🔢 إيجاد أعلى رقم مستخدم لنفس البادئة لضمان العد المستقل لكل صف
    // نجيب كل أكواد نفس البادئة في هذا السنتر
    let maxExistingNumber = 0;
    if (prefix) {
        const { data: existingWithPrefix } = await supabaseAdmin
            .from('students')
            .select('unique_id')
            .eq('center_id', studentData.center_id)
            .like('unique_id', `${prefix}-%`);

        if (existingWithPrefix && existingWithPrefix.length > 0) {
            // استخراج الأرقام من الأكواد الموجودة (مثال: "F-5" → 5)
            const numbers = existingWithPrefix
                .map(s => {
                    const parts = s.unique_id.split('-');
                    return parseInt(parts[parts.length - 1], 10);
                })
                .filter(n => !isNaN(n));
            if (numbers.length > 0) {
                maxExistingNumber = Math.max(...numbers);
            }
        }
    } else {
        // بادئة فارغة: نجيب كل الأكواد الرقمية البحتة
        const { data: existingNumeric } = await supabaseAdmin
            .from('students')
            .select('unique_id')
            .eq('center_id', studentData.center_id);

        if (existingNumeric && existingNumeric.length > 0) {
            const numbers = existingNumeric
                .map(s => parseInt(s.unique_id, 10))
                .filter(n => !isNaN(n));
            if (numbers.length > 0) {
                maxExistingNumber = Math.max(...numbers);
            }
        }
    }

    // نبدأ من أعلى رقم موجود + 1، أو رقم البداية من الإعدادات — أيهما أكبر
    let codeToTry = Math.max(startNumber, maxExistingNumber + 1);
    let isUnique = false;

    // Loop until we find a unique ID (حماية من الـ race conditions وتكرار الـ Auth)
    while (!isUnique) {
        const candidateId = prefix ? `${prefix}-${codeToTry}` : `${codeToTry}`;
        
        // 1. التأكد من عدم وجوده في جدول الطلاب
        const { data: existing } = await supabaseAdmin
            .from('students')
            .select('unique_id')
            .eq('center_id', studentData.center_id)
            .eq('unique_id', candidateId)
            .maybeSingle();

        if (!existing) {
            // 2. التأكد من عدم وجوده في سجلات الـ Auth (Email Check)
            const centerPrefix = studentData.center_id.split('-')[0];
            const candidateEmail = `${candidateId.toLowerCase()}@${centerPrefix}.center.com`;
            
            const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers();
            const existingAuth = existingUsers.find(u => u.email === candidateEmail);

            if (!existingAuth) {
                uniqueId = candidateId;
                isUnique = true;
            } else {
                console.log(`⚠️ Email ${candidateEmail} is already in Auth, skipping ID ${candidateId}`);
                codeToTry++;
                wasAdjusted = true;
            }
        } else {
            codeToTry++;
            wasAdjusted = true;
        }
    }

    // Insert student data
    // 🛡️ RE-FIX: Ensure the auth email ALWAYS matches the final uniqueId
    // If we generated a sequential ID, we must ignore the frontend provided email
    const finalUniqueId = uniqueId;
    const centerPrefix = studentData.center_id.split('-')[0];
    const finalEmail = `${finalUniqueId.toLowerCase()}@${centerPrefix}.center.com`;
    const finalPassword = studentData.password || (studentData.phone || "12345678");

    // 🔒 تم إيقاف إنشاء حسابات المنصة (Auth Disabled by User Request)
    let authUser = null;
    let finalStudentId = randomUUID();

    /* 
    // Auth creation logic is now disabled
    const hasPortal = ...
    if (hasPortal) {
        ...
    }
    */

    // Disable triggers temporarily
    await supabaseAdmin.rpc('exec', { sql: 'ALTER TABLE students DISABLE TRIGGER ALL;' });

    // Insert student data
    const finalData = {
      name: studentData.name,
      phone: studentData.phone,
      parent_phone: studentData.parent_phone,
      mother_phone: studentData.mother_phone || null,   // ✅ رقم الأم
      address: studentData.address || null,             // ✅ العنوان
      specialization: studentData.specialization || null, // ✅ التخصص
      grade: studentData.grade,
      center_id: studentData.center_id,
      enrolled_courses: studentData.enrolled_courses || [],
      course_discounts: studentData.course_discounts || {},
      group_ids: studentData.group_ids || {},
      enrollment_dates: studentData.enrollment_dates || {},
      is_free: studentData.is_free || false,
      is_active: studentData.is_active ?? true,         // ✅ الحالة
      wallet_balance: studentData.has_wallet ? 0 : null,
      has_wallet: studentData.has_wallet || false,
      max_devices: studentData.max_devices || 1,        // ✅ عدد الأجهزة
      id: finalStudentId,
      unique_id: uniqueId,
      access_code: studentData.access_code,
      subscription_type: studentData.subscription_type || 'عادي',
      monthly_courses: studentData.monthly_courses || [],
      free_courses: studentData.free_courses || [],
      center_only_courses: studentData.center_only_courses || []
    };

    const { data, error } = await supabaseAdmin
      .from('students')
      .insert([finalData])
      .select();

    // Re-enable triggers
    await supabaseAdmin.rpc('exec', { sql: 'ALTER TABLE students ENABLE TRIGGER ALL;' });

    if (error) {
      // Cleanup auth user if DB insert fails and auth user was created
      if (authUser?.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data[0],
      wasAdjusted: wasAdjusted
    });

  } catch (error) {
    console.error('Student creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create student' },
      { status: 500 }
    );
  }
}

// ✅✅✅✅ دالة التعديل (PUT) لتفعيل حسابات Quick Add ✅✅✅✅
export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      id, 
      email, 
      password, 
      create_auth_user, 
      grade_prefix,        // 🎯 بادئة الصف لتوليد unique_id
      existing_unique_id,  // كود قديم إن وُجد
      ...dataToUpdate
    } = body;

    let finalUniqueId = existing_unique_id;

    // لو مفيش كود قديم، نولد كود جديد بنفس منطق POST (عداد مستقل لكل بادئة)
    if (!finalUniqueId && create_auth_user && dataToUpdate.center_id) {
        const { data: settings } = await supabaseAdmin
            .from('center_settings')
            .select('next_student_code, student_code_prefix')
            .eq('center_id', dataToUpdate.center_id)
            .maybeSingle();

        const prefix = grade_prefix ?? settings?.student_code_prefix ?? null;
        const startNumber = settings?.next_student_code || 1;

        // 🔢 إيجاد أعلى رقم مستخدم لنفس البادئة
        let maxExistingNumber = 0;
        if (prefix) {
            const { data: existingWithPrefix } = await supabaseAdmin
                .from('students')
                .select('unique_id')
                .eq('center_id', dataToUpdate.center_id)
                .like('unique_id', `${prefix}-%`);

            if (existingWithPrefix && existingWithPrefix.length > 0) {
                const numbers = existingWithPrefix
                    .map(s => {
                        const parts = s.unique_id.split('-');
                        return parseInt(parts[parts.length - 1], 10);
                    })
                    .filter(n => !isNaN(n));
                if (numbers.length > 0) {
                    maxExistingNumber = Math.max(...numbers);
                }
            }
        }

        let codeToTry = Math.max(startNumber, maxExistingNumber + 1);
        let isUnique = false;

        while (!isUnique) {
            const candidateId = prefix ? `${prefix}-${codeToTry}` : `${codeToTry}`;
            const { data: existing } = await supabaseAdmin
                .from('students')
                .select('unique_id')
                .eq('center_id', dataToUpdate.center_id)
                .eq('unique_id', candidateId)
                .maybeSingle();

            if (!existing) {
                finalUniqueId = candidateId;
                isUnique = true;
            } else {
                codeToTry++;
            }
        }
    }

    // 1. تم تعطيل إنشاء المستخدمين (Auth creation disabled)
    /*
    if (create_auth_user && finalUniqueId && password) {
       ...
    }
    */

    // 2. تنظيف البيانات قبل تحديث الجدول
    const cleanData = { ...dataToUpdate };
    // لو عندنا unique_id جديد، نحدثه في الجدول
    if (finalUniqueId) {
        cleanData.unique_id = finalUniqueId;
    }
    
    // 3. تحديث بيانات الطالب في الجدول
    const { error: dbError } = await supabaseAdmin
      .from('students')
      .update(cleanData)
      .eq('id', id);

    if (dbError) {
      console.error("DB Error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, unique_id: finalUniqueId });

  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🗑️ دالة الحذف (DELETE) - تمسح الطالب من الداتابيز ومن الـ Auth
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // 1. مسح البيانات المرتبطة (لتجنب Foreign Key violation)
    await supabaseAdmin.from('student_activities').delete().eq('student_id', id);
    await supabaseAdmin.from('wallet_transactions').delete().eq('student_id', id);
    await supabaseAdmin.from('exam_results').delete().eq('student_id', id);
    await supabaseAdmin.from('subscriptions').delete().eq('student_id', id);

    // 2. مسح المستخدم من Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (authError) {
      console.warn('Auth user deletion warning (might not exist):', authError.message);
    }

    // 3. مسح الطالب من جدول الطلاب
    const { error: dbError } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete student' },
      { status: 500 }
    );
  }
}