import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // 🛠️ 1. إعداد Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 🛡️ 2. التحقق من المستخدم
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 🛡️ 3. حماية المسارات العامة (لو مش مسجل دخول)
  if (path.startsWith('/admin') && !user && path !== '/admin-login' && path !== '/admin/create-center') {
    return NextResponse.redirect(new URL('/admin-login', request.url))
  }

  // 🛡️ 4. التحقق من وجود "سنتر" للمدير المسجل
  // إحنا بنعمل ده بس لو المستخدم مسجل وداخل على أي صفحة غير صفحة الإنشاء
  if (user && path.startsWith('/admin') && path !== '/admin/create-center' && path !== '/admin-login') {
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('role, center_id')
      .eq('id', user.id)
      .maybeSingle()

    // لو المستخدم "admin" ومعندوش سنتر مربوط، نوديه صفحة الإنشاء فوراً
    if ((profile?.role === 'admin' || user.email === 'abdo@smart.com') && !profile?.center_id) {
      return NextResponse.redirect(new URL('/admin/create-center', request.url))
    }

    // 🛡️ 5. حماية المسارات حسب الرتبة (Roles) - الجزء بتاعك الأصلي
    
    // أ- حماية المسارات المالية
    if (path.startsWith('/admin/finance')) {
      if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
        return NextResponse.redirect(new URL('/admin/staff_dashboard', request.url))
      }
    }

    // ب- حماية مسارات الإدارة العليا (Dashboard, Staff, Settings, etc.)
    const adminOnlyPaths = ['/admin/dashboard', '/admin/staff', '/admin/expenses', '/admin/audit', '/admin/settings']
    const isAdminPath = adminOnlyPaths.some(p => path === p || path.startsWith(p + '/'));
    
    if (isAdminPath) {
      if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        return NextResponse.redirect(new URL('/admin/staff_dashboard', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api).*)'],
}