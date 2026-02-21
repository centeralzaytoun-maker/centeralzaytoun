import { createClient } from '@supabase/supabase-js';



// 1. تعريف الروابط مع Fallback

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qngdkkhnvkvgskfxnerh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzMwNzMsImV4cCI6MjA4NDMwOTA3M30.bXa6sGhoXx-xDbOQYOhqEiNZoxYV54HC2VhQXna7xL4';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODczMzA3MywiZXhwIjoyMDg0MzA5MDczfQ.OCPysG5ayWq6ubfSiBIp9QgillRqe9FtMXJApF506x0';



if (!supabaseUrl || !supabaseAnonKey) {

  throw new Error('Supabase URL and Key are missing!');

}

// Validate service role key for admin operations (Server-side only)
if (typeof window === 'undefined' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found in environment - using local fallback');
}



// 2. الكلاينت الأساسي الآمن (Singleton Pattern)
let supabaseInstance;

if (typeof window !== 'undefined') {
  // في المتصفح: بنحاول نسترجع النسخة الموجودة لو موجودة
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
  }
} else {
  // في السيرفر: بننشئ نسخة جديدة لكل طلب (ده الطبيعي في الـ SSR)
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    }
  });
}

export const supabase = supabaseInstance;

// 3. الكلاينت الآدمن للعمليات الحساسة (فقط إذا كان المفتاح متوفر)
export const supabaseAdmin = (typeof window === 'undefined' && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }) 
  : null;

// 👇 4. الحل السحري: بنصدر نفس الكلاينت بس بالاسم القديم

// كده أي ملف في المشروع بيستخدم supabaseBrowser هيشتغل زي الفل من غير تعديل!

export const supabaseBrowser = supabase;