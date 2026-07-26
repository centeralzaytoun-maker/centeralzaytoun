/**
 * ============================================================
 * 🏆 CLASSORA — Advanced k6 Load Testing Script
 * ============================================================
 * Simulates realistic Admin/Staff user journeys against the
 * Supabase REST API (PostgREST) for a single educational center.
 *
 * HOW TO RUN:
 *   k6 run classora_load_test.js
 *
 * PREREQUISITES:
 *   1. Install k6: https://k6.io/docs/getting-started/installation/
 *   2. Fill in the SUPABASE_URL and SUPABASE_ANON_KEY below.
 *   3. Fill in a valid CENTER_ID and a JWT token for a test user.
 * ============================================================
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ============================================================
// ⚙️  CONFIGURATION — Replace these with your real values
// ============================================================
const SUPABASE_URL    = 'https://qngdkkhnvkvgskfxnerh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ2Rra2hudmt2Z3NrZnhuZXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MzMwNzMsImV4cCI6MjA4NDMwOTA3M30.bXa6sGhoXx-xDbOQYOhqEiNZoxYV54HC2VhQXna7xL4';
// A valid, non-expiring JWT for a test admin user in your center.
// Generate via: supabase.auth.signIn(...) and copy the access_token.
const TEST_JWT        = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImFhYzRkZjNhLTY0NWItNGZkYi05MjQ0LTVmYmYwYjVhZWJjNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3FuZ2Rra2hudmt2Z3NrZnhuZXJoLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1MDg5ZmQ0My04YzkwLTQ0OGMtYjBiNC1kN2Q4Y2QwNmVkNjUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1NDg4MjkzLCJpYXQiOjE3NzU0ODQ2OTMsImVtYWlsIjoiYWJkdWxraGFsZXFAY2VudGVyLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiY2VudGVyX2lkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInJvbGUiOiJhZG1pbiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1NDg0NjkzfV0sInNlc3Npb25faWQiOiJiNWJmNjY5MS0zMGFhLTQ1MDUtYmY3ZS1mNzIzOTYxMjk1MzMiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.eEUNUqs6bvq52m48vD-O9rs1CAZD5SntZj88zgLftqO-uehe2O2v6AxHGWFw_DiBtI3W4YT1mLgYf5zzdXRkeA';
// A real center_id UUID from your `centers` table.
const CENTER_ID       = '00000000-0000-0000-0000-000000000000';

// ============================================================
// 📊 CUSTOM METRICS
// ============================================================

// Tracks % of requests that returned an HTTP error (4xx or 5xx)
const errorRate = new Rate('classora_error_rate');

// Tracks individual endpoint latencies (in ms)
const studentsListDuration    = new Trend('duration_students_list',    true);
const studentDetailDuration   = new Trend('duration_student_detail',   true);
const sessionsListDuration    = new Trend('duration_sessions_list',    true);
const coursesListDuration     = new Trend('duration_courses_list',     true);
const centerSettingsDuration  = new Trend('duration_center_settings',  true);
const dashboardQueryDuration  = new Trend('duration_dashboard_query',  true);

// Counts total successful "page views" simulated
const successfulPageViews = new Counter('classora_successful_page_views');

// ============================================================
// 🎯 LOAD TEST STAGES & THRESHOLDS
// ============================================================
export const options = {
  /**
   * STAGES: Simulates a realistic traffic spike:
   *   1. Ramp-up:   0 → 50 users over 1 minute  (morning login rush)
   *   2. Sustained: 50 → 100 users over 1 minute (peak usage hour)
   *   3. Plateau:   100 users held for 2 minutes  (stress period)
   *   4. Ramp-down: 100 → 0 users over 30 seconds (end of session)
   */
  stages: [
    { duration: '1m',  target: 50  },
    { duration: '1m',  target: 100 },
    { duration: '2m',  target: 100 },
    { duration: '30m', target: 100 },
    { duration: '30s', target: 0   },
  ],

  /**
   * THRESHOLDS: The SLAs the system must meet.
   * These are the numbers you present to the TA as proof.
   * If any threshold is breached, the test "fails" (exit code 1).
   */
  thresholds: {
    // ✅ Global: 99% of ALL requests must complete under 1500ms
    'http_req_duration': ['p(99)<1500'],

    // ✅ Error rate must stay below 1%
    'classora_error_rate': ['rate<0.01'],

    // ✅ Student list page (most common): p(95) < 400ms
    'duration_students_list': ['p(95)<400'],

    // ✅ Sessions list page: p(95) < 400ms
    'duration_sessions_list': ['p(95)<400'],

    // ✅ Dashboard summary query: p(95) < 600ms (more complex query)
    'duration_dashboard_query': ['p(95)<600'],

    // ✅ HTTP request failures (network errors, not 4xx/5xx) < 0.5%
    'http_req_failed': ['rate<0.005'],
  },
};

// ============================================================
// 🏗️  SHARED HEADERS
// ============================================================
const headers = {
  'apikey':        SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${TEST_JWT}`,
  'Content-Type':  'application/json',
  // PostgREST: request a count for pagination metadata
  'Prefer':        'count=exact',
};

// ============================================================
// 🎭 HELPER: Build a Supabase REST API URL
// ============================================================
function supabaseUrl(table, queryString = '') {
  return `${SUPABASE_URL}/rest/v1/${table}${queryString ? '?' + queryString : ''}`;
}

// ============================================================
// 🧪 MAIN VIRTUAL USER SCENARIO (default function)
// Each virtual user (VU) runs this loop continuously.
// ============================================================
export default function () {

  // --- SCENARIO: Admin/Staff daily workflow ---
  // This mirrors what a real center user does when they open the app.

// ── 1. Admin Dashboard Load ──────────────────────────────
  group('1. Dashboard Load', function () {
    const start = Date.now();

// Fetch active students count
    const studentsCountRes = http.get(
      supabaseUrl('students', `center_id=eq.${CENTER_ID}&select=id&limit=1`),
      { headers, tags: { name: 'dashboard_students_count' } }
    );
    
    // Fetch sessions count (تم التعديل هنا لـ created_at)
    const sessionsCountRes = http.get(
      supabaseUrl('sessions', `center_id=eq.${CENTER_ID}&select=id,status&order=created_at.desc&limit=100`),
      { headers, tags: { name: 'dashboard_sessions_today' } }
    );
    
    // Fetch recent wallet transactions (financial summary)
    const walletRes = http.get(
      supabaseUrl('wallet_transactions', `center_id=eq.${CENTER_ID}&select=id,amount,type,created_at&order=created_at.desc&limit=5`),
      { headers, tags: { name: 'dashboard_wallet_recent' } }
    );

    const dashboardOk =
      check(studentsCountRes, { '[Dashboard] students count 200': (r) => r.status === 200 }) &&
      check(sessionsCountRes,  { '[Dashboard] sessions today 200': (r) => r.status === 200 }) &&
      check(walletRes,         { '[Dashboard] wallet recent 200':  (r) => r.status === 200 });

    dashboardQueryDuration.add(Date.now() - start);
    errorRate.add(!dashboardOk);
    if (dashboardOk) successfulPageViews.add(1);

    sleep(randomIntBetween(1, 3)); // user reads the dashboard
  });

  // ── 2. Students List Page ────────────────────────────────
  group('2. Students List', function () {
    
    const res = http.get(
      // التعديل تم هنا: unique_id و group_ids
      supabaseUrl('students', `center_id=eq.${CENTER_ID}&select=id,name,unique_id,grade,is_active,wallet_balance,group_ids&order=name.asc&limit=50`),
      { headers, tags: { name: 'students_list' } }
    );

    // 🔴 السطرين دول عشان نطبع الإيرور
    if (res.status !== 200) {
      console.log(`🚨 الداتا بيز بتقول: Status ${res.status} | رسالة الخطأ: ${res.body}`);
    }
    const ok = check(res, {
      '[Students List] status 200':     (r) => r.status === 200,
      '[Students List] returns array':  (r) => Array.isArray(JSON.parse(r.body)),
      '[Students List] p95 target met': (r) => r.timings.duration < 400,
    });

    studentsListDuration.add(res.timings.duration);
    errorRate.add(!ok);
    if (ok) successfulPageViews.add(1);

    // Simulate the user picking a random student from the list to view
    const students = JSON.parse(res.body || '[]');
    if (students.length > 0) {
      const randomStudent = students[randomIntBetween(0, students.length - 1)];

      sleep(randomIntBetween(1, 2)); // think time: user scans the list

      // ── 3. Student Detail Page ───────────────────────────
      group('3. Student Detail', function () {
        const detailRes = http.get(
          supabaseUrl('students', `id=eq.${randomStudent.id}&center_id=eq.${CENTER_ID}&select=*&limit=1`),
          { headers, tags: { name: 'student_detail' } }
        );

        const walletHistRes = http.get(
          supabaseUrl('wallet_transactions', `student_id=eq.${randomStudent.id}&center_id=eq.${CENTER_ID}&select=id,amount,type,created_at&order=created_at.desc&limit=20`),
          { headers, tags: { name: 'student_wallet_history' } }
        );

        const detailOk =
          check(detailRes,    { '[Student Detail] status 200': (r) => r.status === 200 }) &&
          check(walletHistRes, { '[Student Wallet] status 200': (r) => r.status === 200 });

        studentDetailDuration.add(detailRes.timings.duration);
        errorRate.add(!detailOk);
        if (detailOk) successfulPageViews.add(1);
      });
    }

    sleep(randomIntBetween(2, 4));
  });

  // ── 7. Simulate a Write Operation ───────────────────────
// ── 7. Create Session (Write Test) ───────────────────────────
group('7. Create Session (Write Test)', function () {
  const payload = JSON.stringify({
    center_id:    CENTER_ID,
    topic:        'Load Test Session - k6', // 🔴 الحقل الإجباري اللي كان ناقص
    status:       'scheduled',
    is_completed: false,
    // created_at مش محتاجين نبعتها لأن الداتا بيز بتعملها default now() تلقائياً
  });

  // بننسخ الهيدرز الأساسية ونعدل الـ Prefer عشان يتناسب مع الـ POST
  const postHeaders = Object.assign({}, headers);
  postHeaders['Prefer'] = 'return=minimal';

  const res = http.post(
    supabaseUrl('sessions'),
    payload,
    { headers: postHeaders, tags: { name: 'create_session' } }
  );

  // 🔴 السطر ده هيطبعلك الإيرور لو الداتا بيز رفضت الإضافة لأي سبب تاني
  if (res.status !== 201) {
    console.log(`🚨 Insert Error: Status ${res.status} | Body: ${res.body}`);
  }

  const ok = check(res, {
    '[Create Session] status 201': (r) => r.status === 201,
  });

  errorRate.add(!ok);
  if (ok) successfulPageViews.add(1);

  sleep(randomIntBetween(1, 2));
});

  // ── 4. Sessions (Lessons) Page ───────────────────────────
  group('4. Sessions List', function () {
      
      const res = http.get(
      supabaseUrl('sessions', `center_id=eq.${CENTER_ID}&select=id,created_at,status,group_id,course_id,is_completed&order=created_at.desc&limit=50`),
      { headers, tags: { name: 'sessions_list' } }
    );

    const ok = check(res, {
      '[Sessions List] status 200':    (r) => r.status === 200,
      '[Sessions List] returns array': (r) => Array.isArray(JSON.parse(r.body)),
    });

    sessionsListDuration.add(res.timings.duration);
    errorRate.add(!ok);
    if (ok) successfulPageViews.add(1);

    sleep(randomIntBetween(1, 3));
  });

  // ── 5. Courses Page ──────────────────────────────────────
  group('5. Courses List', function () {
    const res = http.get(
      supabaseUrl('courses', `center_id=eq.${CENTER_ID}&select=id,name,grade,instructor_id&order=name.asc&limit=100`),
      { headers, tags: { name: 'courses_list' } }
    );

    const ok = check(res, {
      '[Courses List] status 200': (r) => r.status === 200,
    });

    coursesListDuration.add(res.timings.duration);
    errorRate.add(!ok);
    if (ok) successfulPageViews.add(1);

    sleep(randomIntBetween(1, 2));
  });

  // ── 6. Center Settings Read ──────────────────────────────
  // Happens on every page load (admin layout fetches this server-side)
  group('6. Center Settings', function () {
    const res = http.get(
      supabaseUrl('center_settings', `center_id=eq.${CENTER_ID}&select=center_name,logo_url,primary_color,phone&limit=1`),
      { headers, tags: { name: 'center_settings' } }
    );

    const ok = check(res, {
      '[Center Settings] status 200': (r) => r.status === 200,
    });

    centerSettingsDuration.add(res.timings.duration);
    errorRate.add(!ok);
    if (ok) successfulPageViews.add(1);

    sleep(randomIntBetween(1, 2));
  });

  // Small pause between full user journey cycles
  sleep(randomIntBetween(3, 7));
}

// ============================================================
// 📋 TEARDOWN — Runs once after all VUs finish
// ============================================================
export function teardown(data) {
  console.log('✅ Classora Load Test Complete. Check the summary above.');
}
