/**
 * ============================================================
 * src/app/student/courses/page.js  —  SERVER COMPONENT
 * ============================================================
 *
 * ARCHITECTURE PATTERN: Two-Layer Data Fetching
 * ─────────────────────────────────────────────
 *
 * LAYER 1 — Server (this file, runs on the edge/Node.js):
 *   • Fetches SHARED center-level data: courses list + center settings
 *   • Uses Next.js `unstable_cache` → cached for 5 minutes per centerId
 *   • Result: 10,000 students viewing the same center's courses page
 *     fire only 1 Supabase query per 5 min, not 10,000.
 *
 * LAYER 2 — Client (CoursesClient.jsx):
 *   • Fetches PRIVATE per-student data: enrollments, access, exam counts
 *   • Runs 5 queries in parallel (Promise.all)
 *   • Cannot be cached — unique per student, per request
 *
 * Before this fix:   7 sequential client-side queries per student visit
 * After this fix:    0 server queries (cached) + 5 parallel client queries
 *
 * WHY unstable_cache (not React cache()):
 *   • React cache() lives for a single render tree (one request)
 *   • unstable_cache persists across ALL requests until TTL expires
 *   • Perfect for data that's the same for all students of a center
 *
 * WHY NOT make the entire page a Server Component?
 *   • Student enrollments/access data is user-specific → must be fetched
 *     client-side where we have the auth session
 *   • The interactive search bar requires client-side state
 * ============================================================
 */

import { unstable_cache } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import CoursesClient from './CoursesClient';

// ──────────────────────────────────────────────────────────────
// Cached data fetcher — runs at most ONCE per centerId per 5 min
// across ALL concurrent student requests.
// ──────────────────────────────────────────────────────────────
const getCenterCoursesData = unstable_cache(
  async (centerId, studentGrade) => {
    // We need a Supabase service call here — this runs server-side only.
    // Import is inside the cached fn to avoid client bundle leakage.
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    let coursesQuery = supabase
      .from('courses')
      .select(`
        id, name, grade, description, thumbnail_url,
        digital_full_price, digital_price, original_price,
        created_at,
        instructors ( name )
      `)
      .eq('center_id', centerId);

    // Only return courses matching the student's grade (reduces payload)
    if (studentGrade) {
      coursesQuery = coursesQuery.eq('grade', studentGrade);
    }

    const [{ data: courses }, { data: settings }, { data: center }] = await Promise.all([
      coursesQuery,
      supabase
        .from('center_settings')
        .select('primary_color, secondary_color, center_name, instructor_name, instructor_title')
        .eq('center_id', centerId)
        .maybeSingle(),
      supabase
        .from('centers')
        .select('center_type')
        .eq('id', centerId)
        .maybeSingle(),
    ]);

    return {
      courses: courses || [],
      settings: settings || null,
      centerType: center?.center_type || 'center',
    };
  },
  // Cache key — varies by centerId + student grade
  // Result: one cache entry per (center, grade) combination
  ['student-courses'],
  {
    revalidate: 300,    // 5 minutes — courses don't change every second
    tags: ['courses'],  // can be invalidated with revalidateTag('courses') after an admin edits a course
  }
);

// ──────────────────────────────────────────────────────────────
// Server Component — the actual page.js export
// ──────────────────────────────────────────────────────────────
export default async function StudentCoursesPage() {
  // 1. Get the authenticated student from the session cookie (server-side, no DB)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Middleware handles the redirect, but guard here as a fallback
    return null;
  }

  // 2. Fetch the student's centerId and grade (ONE lightweight query, not cached
  //    because it's personal data that changes if the student is updated)
  const { data: studentProfile } = await supabase
    .from('students')
    .select('center_id, grade')
    .eq('id', user.id)
    .maybeSingle();

  const centerId   = studentProfile?.center_id;
  const studentGrade = studentProfile?.grade || null;

  if (!centerId) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <p className="font-bold text-slate-400">لم يتم ربط حسابك بمركز تعليمي. تواصل مع الإدارة.</p>
      </div>
    );
  }

  // 3. Fetch center-level data — CACHED for 5 minutes per (centerId, grade)
  //    This is the key optimization: 10,000 students → 1 query per 5 min
  const { courses, settings, centerType } = await getCenterCoursesData(centerId, studentGrade);

  // 4. Render: pass cached props to the Client Component
  //    The Client Component then fetches only student-specific data
  return (
    <CoursesClient
      centerCourses={courses}
      centerSettings={settings}
      centerType={centerType}
    />
  );
}

// Tell Next.js what metadata this page has
export const metadata = {
  title: 'بوابة المناهج الرقمية | Classora',
  description: 'استعرض كل المواد الدراسية المتاحة وادخل على محتواك التعليمي',
};
