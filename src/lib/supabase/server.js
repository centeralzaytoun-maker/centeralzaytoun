import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // Final Fix: Use hard-coded values if env vars are missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qngdkkhnvkvgskfxnerh.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzMwNzMsImV4cCI6MjA4NDMwOTA3M30.bXa6sGhoXx-xDbOQYOhqEiNZoxYV54HC2VhQXna7xL4';

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                // السطر السحري:
                // لو احنا production (مرفوعين) خليها true
                // لو احنا dev (على جهازك) خليها false
                secure: process.env.NODE_ENV === 'production',
              })
            )
          } catch {
            // تجاهل الخطأ لو بننادي من Server Component
          }
        },
      },
    }
  )
}