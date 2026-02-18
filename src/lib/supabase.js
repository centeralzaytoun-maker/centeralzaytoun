import { createClient } from '@supabase/supabase-js';



// 1. تعريف الروابط مع Fallback

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;



if (!supabaseUrl || !supabaseAnonKey) {

  throw new Error('Supabase URL and Key are missing!');

}

// Validate service role key for admin operations

if (!supabaseServiceKey) {

  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found - admin operations will fail');

}



// 2. الكلاينت الأساسي الآمن

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {

  auth: {

    persistSession: true,

    autoRefreshToken: true,

    detectSessionInUrl: true,

  }

});



// 3. الكلاينت الآدمن للعمليات الحساسة (فقط إذا كان المفتاح متوفر)

export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {

  auth: {

    persistSession: false,

    autoRefreshToken: false,

  }

}) : null;



// 👇 4. الحل السحري: بنصدر نفس الكلاينت بس بالاسم القديم

// كده أي ملف في المشروع بيستخدم supabaseBrowser هيشتغل زي الفل من غير تعديل!

export const supabaseBrowser = supabase;