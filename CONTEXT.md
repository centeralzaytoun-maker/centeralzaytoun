# 📋 CONTEXT.md — Al-Awael Smart Center (الأوائل)

> **Purpose**: Master context file to prime AI assistants with full project understanding.
> **Last Updated**: 2026-02-12

---

## 1. Project Overview

**Al-Awael Smart Center** is a multi-tenant SaaS platform for managing educational centers (مراكز تعليمية) in the Arab region. Each center is an isolated tenant that manages its own students, courses, sessions (classes/lessons), instructors, groups, finances, and a store (for books/materials).

The platform operates on a **package-based subscription model**: a **Super Admin** creates packages with selectable features, assigns them to centers, and controls the subscription lifecycle (activation, renewal, expiry). Center admins only see features included in their active package.

- **Framework**: Next.js 16 (App Router, Server Components + `'use client'` Client Components)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Row Level Security + Storage)
- **Styling**: Tailwind CSS v4
- **Language/Direction**: Arabic (RTL), Cairo font (Google Fonts)
- **Deployment**: Vercel

---

## 2. Tech Stack

| Category | Library | Purpose |
|---|---|---|
| **Core** | `next@16`, `react@19`, `react-dom@19` | App framework and rendering |
| **Auth & DB** | `@supabase/supabase-js`, `@supabase/ssr` | Supabase client (browser + server) and auth |
| **State/Cache** | `@tanstack/react-query` | Server-state caching for permissions & data |
| **Push Notifications** | `firebase` | FCM push notifications to parent devices |
| **Icons** | `react-icons`, `lucide-react` | UI icons (Fa + Lucide) |
| **Notifications** | `react-hot-toast`, `sonner` | Toast notification systems |
| **Charts** | `recharts` | Dashboard analytics charts |
| **PDF** | `@react-pdf/renderer`, `puppeteer` | PDF generation (reports, invoices) |
| **Scanning** | `html5-qrcode`, `qrcode.react`, `jsbarcode` | QR/barcode scan for attendance & store |
| **Export** | `xlsx` | Excel export for data reports |
| **Styling** | `tailwindcss@4`, `@tailwindcss/postcss` | Utility-first CSS |

---

## 3. Folder Structure

```
smart-center/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.js                 # Root layout (Cairo font, RTL, ReactQuery + Providers)
│   │   ├── page.js                   # Landing / login redirect page
│   │   ├── auth-actions.js           # Server Actions: loginAdmin, loginStudent, signOut
│   │   ├── admin/                    # 🔒 Admin panel (center staff + admin users)
│   │   │   ├── layout.js             # Server Component: auth check, fetches profile + center_settings, renders Sidebar + AdminGuard + AuthProvider
│   │   │   ├── dashboard/            # Admin-only management dashboard (analytics)
│   │   │   ├── staff_dashboard/      # Staff-facing home dashboard
│   │   │   ├── students/             # CRUD students (with sub-pages)
│   │   │   ├── sessions/             # Session/lesson management (with attendance)
│   │   │   ├── courses/              # Course/subject management
│   │   │   ├── groups/               # Student group management
│   │   │   ├── instructors/          # Instructor profiles
│   │   │   ├── schedule/             # Weekly timetable
│   │   │   ├── notifications/        # Broadcast notification center
│   │   │   ├── store/                # Store/bookshop management (inventory + sales)
│   │   │   ├── finance/              # Debts + wallet recharges (sub-routes)
│   │   │   ├── expenses/             # Expense tracking (admin-only)
│   │   │   ├── audit/                # Audit log (admin-only)
│   │   │   ├── staff/                # Staff management (admin-only)
│   │   │   ├── settings/             # Center settings (name, logo, color) + GradeSyncManager
│   │   │   ├── support/              # Support tickets
│   │   │   └── inbox/                # Internal messaging
│   │   ├── super-admin/              # 🔑 Super Admin: manage all centers, packages, features
│   │   ├── portal/                   # 🎓 Student portal (dashboard, inbox, report/[id])
│   │   ├── parent/                   # 👨‍👩‍👧 Parent login (code-based + PIN-based)
│   │   ├── admin-login/              # Admin/staff login page
│   │   ├── login/                    # Student login page
│   │   ├── create-center/            # New center registration wizard
│   │   ├── expired/                  # Subscription expired landing page
│   │   ├── 403/                      # Access denied page
│   │   └── api/                      # API routes
│   │       ├── admin/                #   Admin API operations
│   │       ├── cron/                 #   Scheduled tasks (e.g., reminder jobs)
│   │       ├── generate-pdf/         #   Server-side PDF generation
│   │       ├── notifications/        #   Push notification gateway (2 routes)
│   │       ├── staff-permissions/    #   CRUD staff permissions
│   │       ├── students/             #   Student-specific API
│   │       └── update-pins/          #   Batch PIN updates
│   ├── components/                   # Shared UI components
│   │   ├── Sidebar.js                # ⭐ Main nav — filters menu items by allowedFeatures
│   │   ├── FeatureGuard.js           # ⭐ Page-level wrapper — blocks access if feature not in package
│   │   ├── AdminGuard.js             # ⭐ Client guard — prevents staff from accessing admin-only routes
│   │   ├── BrandHeader.jsx           # Center-branded header with logo/color
│   │   ├── DailyReportModal.js       # Daily attendance summary modal
│   │   ├── StudentTimeline.js        # Student history timeline
│   │   ├── ReactQueryProvider.jsx    # React Query client provider wrapper
│   │   ├── providers.tsx             # Sonner Toaster provider
│   │   ├── TestStudentScenarios.jsx  # Dev testing utility
│   │   └── sessions/                 # Session-specific sub-components (5 files)
│   ├── context/
│   │   └── AuthContext.js            # ⭐ Global auth context (user, role, centerId, allowedFeatures)
│   ├── lib/
│   │   ├── supabase.js               # Browser Supabase client (anon + admin/service role)
│   │   ├── supabase-browser.js       # Re-export alias for supabase.js
│   │   ├── supabase/
│   │   │   ├── server.js             # Server-side Supabase client (cookie-based SSR)
│   │   │   └── middleware.js          # Supabase middleware helper
│   │   ├── settings.js               # getCenterSettings() — fetches center_settings by center_id
│   │   ├── firebase.js               # Firebase FCM init for push notifications
│   │   ├── notifications.js          # Notification utility functions
│   │   ├── student-notifications.js  # Student-specific notification helpers
│   │   └── activities.js             # Activity logging utilities
│   ├── hooks/
│   │   ├── useAttendance.js          # Attendance tracking logic (scan in/out)
│   │   ├── useScanner.js             # QR/barcode scanning logic (html5-qrcode)
│   │   ├── useExpenses.js            # Expense CRUD with center_id scoping
│   │   ├── usePermission.js          # ⭐ Staff fine-grained permissions (admin = all, staff = checked)
│   │   └── useSessionData.js         # Session data fetching
│   ├── security/                     # Security & AI analysis modules
│   │   ├── securityEngine.js         # Core security engine
│   │   ├── aiSummaryEngine.js        # AI-powered summary generation
│   │   ├── patternDetector.ts        # Behavioral pattern detection
│   │   ├── permissionsGuard.ts       # Permissions enforcement
│   │   └── riskEngine.ts             # Risk scoring engine
│   ├── utils/
│   │   ├── htmlToPdf.js              # HTML → PDF conversion (puppeteer)
│   │   └── sessionCalculations.js    # Session/attendance math utilities
│   ├── middleware.js                  # ⭐ Next.js Edge middleware (auth + role routing)
│   ├── middleware-saas.js            # Alternative SaaS middleware (sets x-center-id header)
│   └── pdf/                          # PDF template files
├── database/
│   ├── migrations/                   # Schema migrations (grades, courses, returns, etc.)
│   ├── functions/                    # Supabase DB functions
│   └── triggers/                     # Supabase DB triggers
├── database-migrations/              # SaaS migration SQL files
│   ├── 01_saas_migration_final.sql   # ⭐ Core SaaS schema (centers table + center_id columns + RLS)
│   └── 02_rls_policies_complete.sql  # Full RLS policy definitions
├── supabase/                         # Supabase local dev config
├── scripts/                          # Utility scripts (e.g., send-lesson-reminder.js)
├── *.sql                             # Various one-off SQL patches (root level)
└── package.json
```

---

## 4. Database Schema

### 4.1 Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| **`centers`** | Each center is a tenant | `id (UUID PK)`, `name`, `domain`, `is_active`, `subscription_end_date`, `package_id → packages`, `max_students`, `logo_url`, `primary_color`, `center_phone`, `center_address` |
| **`packages`** | Subscription tiers sold by Super Admin | `id (UUID PK)`, `name`, `price`, `duration_days`, `max_students`, `is_active` |
| **`features`** | Master list of all platform features | `id (TEXT PK, e.g. 'page_sessions')`, `name`, `description` |
| **`package_features`** | Junction: which features belong to which package | `package_id → packages`, `feature_id → features` |
| **`staff_profiles`** | Admin/staff users linked to a center | `id (UUID PK → auth.users)`, `center_id → centers`, `role ('admin'│'staff'│'super_admin')`, `full_name`, `email` |
| **`staff_permissions`** | Fine-grained per-staff permissions | `staff_id → staff_profiles`, `center_id → centers`, `permission_key` |
| **`students`** | Students enrolled at a center | `id (UUID PK → auth.users)`, `center_id → centers`, `student_code`, `name`, `phone`, `grade`, `group_id`, `wallet_balance` |
| **`courses`** | Subjects/courses offered | `center_id → centers`, `name`, `instructor_id` |
| **`groups`** | Student groups/classes | `center_id → centers`, `name`, `course_id` |
| **`sessions`** | Scheduled class sessions (lessons) | `center_id → centers`, `group_id`, `date`, `status` |
| **`expenses`** | Center operating expenses | `center_id → centers`, `amount`, `category`, `date` |
| **`debts`** | Student debts/receivables | `center_id → centers`, `student_id`, `amount` |
| **`wallet_transactions`** | Student wallet top-up/deduction history | `center_id → centers`, `student_id`, `amount`, `type` |
| **`center_settings`** | Per-center branding/customization | `center_id → centers`, `center_name`, `logo_url`, `primary_color`, `phone`, `address`, `whatsapp_template` |
| **`parent_device_tokens`** | FCM tokens for parent push notifications | `parent_phone`, `device_token`, `center_id` |

### 4.2 Entity Relationships

```
Center (1) ──→ (N) Staff Profiles
Center (1) ──→ (N) Students
Center (1) ──→ (N) Courses ──→ (N) Groups ──→ (N) Sessions
Center (1) ──→ (1) Center Settings
Center (N) ──→ (1) Package ──→ (N) Package Features ──→ (N) Features
Student (1) ──→ (N) Debts
Student (1) ──→ (N) Wallet Transactions
Staff (1) ──→ (N) Staff Permissions
```

### 4.3 Row Level Security (RLS)

Every table with `center_id` has RLS enabled. The core policy pattern is:

```sql
-- Users can only access rows belonging to their own center
FOR SELECT USING (
  center_id IN (
    SELECT center_id FROM staff_profiles WHERE id = auth.uid()
  )
)
```

- `centers`: users can view only their own center.
- `staff_profiles`: view = same center; update = own profile only; insert = admin/super_admin of same center.
- `students`, `courses`, `groups`, `sessions`, `expenses`, `debts`, `wallet_transactions`: full CRUD scoped to same center via `staff_profiles.center_id` lookup.

---

## 5. Core Logic & Security (The "Gatekeeper" System)

The security system has **4 layered defenses** that work together:

### Layer 1: Edge Middleware (`src/middleware.js`)

Runs on every request **before** the page loads (server-side, edge runtime).

**Flow:**
1. Creates a Supabase SSR client from request cookies.
2. Calls `supabase.auth.getUser()` — if no user and path starts with `/admin`, → redirect to `/admin-login`.
3. If user exists and on `/admin/*`:
   - Fetches `staff_profiles` to get `role` and `center_id`.
   - If role is `admin` but `center_id` is null → redirect to `/admin/create-center`.
   - **Role-based route blocking:**
     - `/admin/finance/*` → requires `admin` or `staff` role.
     - `/admin/dashboard`, `/admin/staff`, `/admin/expenses`, `/admin/audit`, `/admin/settings` → requires `admin` or `super_admin` role.
     - Non-matching roles → redirect to `/admin/staff_dashboard`.

### Layer 2: Server Layout (`src/app/admin/layout.js`)

A **Server Component** that runs on the server for every admin page render.

**Flow:**
1. Creates a server-side Supabase client (`lib/supabase/server.js` — cookie-based).
2. Calls `getUser()` — no user → `redirect('/admin-login')`.
3. Fetches `staff_profiles` (role, center_id) and `center_settings` (brand color, name, logo).
4. Passes `initialUser`, `initialRole`, `initialCenterId` as **props to `<AuthProvider>`** (server → client hydration — avoids client-side re-fetch flicker).
5. Renders `<AdminGuard>` + `<Sidebar>` + branded header.

### Layer 3: AuthContext (`src/context/AuthContext.js`) — The Heart

A **client-side React Context** that holds global auth state and acts as the "gatekeeper":

**State**: `user`, `session`, `centerId`, `role`, `allowedFeatures[]`, `loading`.

**Initialization Flow:**
1. Receives `initialUser`, `initialRole`, `initialCenterId` from server layout (hydration).
2. If initial props exist → uses them immediately (no client fetch, no flicker).
3. If no initial props → calls `supabase.auth.getSession()` + `fetchProfile()` to resolve.
4. Subscribes to `onAuthStateChange` for `SIGNED_OUT` events.

**`verifyCenterAccess(centerId)` — the Gatekeeper function (runs on every page navigation):**
1. Queries `centers` table with a **nested join**: `centers → packages → package_features`.
2. Checks `is_active` is `true` and `subscription_end_date` is in the future.
3. **If inactive or expired** → clears `centerId`, redirects to `/expired`.
4. **If active** → extracts `package_features[].feature_id` → sets `allowedFeatures[]`.

**Key Behavior**: `verifyCenterAccess` runs inside a `useEffect` that depends on `pathname`, meaning it re-verifies on every route change — acting as a lightweight "gatekeeper" without re-initializing the full auth flow.

### Layer 4: Client-Side Guards (Components)

| Component | Purpose | Mechanism |
|---|---|---|
| **`Sidebar.js`** | Hides menu items the center hasn't paid for | Each `menuItem` has a `feature` key (e.g. `'page_sessions'`). `filterAllowedItems()` checks `allowedFeatures.includes(item.feature)`. Items without a `feature` key always show. Admin-only items (dashboard, staff, settings) show only for `userRole === 'admin'`. |
| **`FeatureGuard.js`** | Page-level wrapper — blocks content if feature is missing | Wraps page content. Reads `allowedFeatures` from AuthContext. If `featureId` is NOT in the list → shows a "Feature Locked 🔒" screen with an upgrade CTA. Otherwise → renders `{children}`. |
| **`AdminGuard.js`** | Prevents staff from client-navigating to admin routes | Invisible component mounted in admin layout. Watches `pathname` — if user is not `admin`/`super_admin` and route is restricted → `router.replace('/admin/staff_dashboard')`. |
| **`usePermission.js`** | Fine-grained action-level permissions | Uses React Query to fetch `staff_permissions` by `staff_id` + `center_id`. Exposes `can(permissionKey)`: admins return `true` for everything, staff require an explicit `permission_key` entry. |

### Security Data Flow Summary

```
Request → [Middleware: auth + role check]
       → [Server Layout: fetch profile + settings, hydrate AuthProvider]
       → [AuthContext: verifyCenterAccess on route change — check is_active + subscription_end_date]
       → [Sidebar: filter menu by allowedFeatures]
       → [FeatureGuard: block page content if feature not in package]
       → [usePermission: fine-grained action check within allowed pages]
```

---

## 6. Key Features & Business Logic

### 6.1 Packages & Features System (Super Admin)

**Location**: `src/app/super-admin/page.js`

The Super Admin dashboard has two tabs:

**Tab 1 — Centers Management:**
- Lists all registered centers with: name, current package, subscription end date, active/inactive status.
- **Toggle activation**: instantly sets `centers.is_active` to true/false.
- **Renewal modal**: select a new package + manually set a new `subscription_end_date`, then updates the `centers` row (also sets `is_active = true`).

**Tab 2 — Packages Management:**
- Lists all packages as cards (name, price, duration_days, max_students, associated features).
- **Create package form**:
  - Basic fields: name, price (EGP), duration (days), max students.
  - **Feature picker** split into two sections:
    - 📄 **Page features** (`page_*`): controls which sidebar pages are visible (e.g., `page_sessions`, `page_store`, `page_notifications`).
    - ⚡ **Premium actions**: non-page features (e.g., `bulk_notifications`, premium analytics).
  - On submit: inserts into `packages` table, then inserts rows into `package_features` junction table.
- **Toggle package visibility**: sets `packages.is_active` (hidden packages can't be assigned to new centers).

**Data Flow — How features reach the client:**
```
Super Admin creates Package → links Features via package_features
Super Admin assigns Package to Center → centers.package_id = package.id
Center user logs in → AuthContext.verifyCenterAccess() →
  queries centers → packages → package_features → extracts feature_ids →
  sets allowedFeatures[] → Sidebar filters, FeatureGuard blocks/allows
```

### 6.2 Center Settings Customization

**Location**: `src/app/admin/settings/page.js`, `src/lib/settings.js`

Each center can customize:
- **Center Name** (`center_name`)
- **Logo** (`logo_url` — uploaded to Supabase Storage)
- **Primary Color** (`primary_color` — applied to the admin header gradient)
- **Phone** and **Address**
- **WhatsApp Template** (`whatsapp_template` — used for parent notifications)

Settings are fetched in two places:
1. **Server-side**: `admin/layout.js` fetches `center_settings` to render the branded header with the correct color and logo on first load.
2. **Client-side**: `lib/settings.js` → `getCenterSettings(centerId)` for any component that needs it. Falls back to defaults (`#2563eb` blue, "Smart Center") if no settings exist.

Settings also include a **GradeSyncManager** component for syncing educational stage/grade data across the system.

### 6.3 Authentication Flows

| Flow | Mechanism |
|---|---|
| **Admin/Staff Login** | `loginAdminAction()` — email/password via Supabase Auth → fetch `staff_profiles` for role + center_id → update user metadata → return `{ role, centerId }` to client |
| **Student Login** | `loginStudentAction()` — student code is converted to fake email (`{code}@center.com`) → password auth → verify exists in `students` table → update metadata `role: 'student'` |
| **Parent Login** | Separate login pages (`/parent/login`, `/parent/pin-login`) — code-based or PIN-based authentication |
| **Sign Out** | `signOutAction()` — server action that calls `supabase.auth.signOut()`, revalidates path, redirects to `/admin-login` |

### 6.4 Supabase Client Architecture

| Client | File | Context | Purpose |
|---|---|---|---|
| **Browser (anon)** | `lib/supabase.js` → `supabase` | Client components | Standard authenticated operations (auto-refresh, persist session) |
| **Browser (admin)** | `lib/supabase.js` → `supabaseAdmin` | Client components | Service-role client for admin operations (bypasses RLS) |
| **Server (SSR)** | `lib/supabase/server.js` → `createClient()` | Server components, server actions | Cookie-based SSR client (secure in prod, non-secure in dev) |
| **Middleware** | Inline in `middleware.js` | Edge middleware | Cookie-based client for auth checks at the edge |

### 6.5 Student Portal

**Location**: `src/app/portal/` — dedicated student-facing area with:
- **Dashboard**: student's own data, attendance, wallet.
- **Inbox**: messages/notifications from center.
- **Report** (`/report/[id]`): individual student progress reports.

### 6.6 Push Notifications (Firebase)

**Location**: `src/lib/firebase.js`, `src/lib/notifications.js`, `src/api/notifications/`

Firebase Cloud Messaging is used for sending push notifications to parent devices. Device tokens are stored in `parent_device_tokens` table.

### 6.7 Custom Hooks Summary

| Hook | Purpose |
|---|---|
| `useAttendance` | QR-scan-based attendance tracking (check-in/check-out logic) |
| `useScanner` | html5-qrcode integration for barcode/QR reading |
| `useExpenses` | CRUD for center expenses with center_id scoping |
| `usePermission` | Fine-grained `can(permissionKey)` checks (admin = all, staff = explicit) |
| `useSessionData` | Fetch session/lesson data |

---

## 7. Quick Reference: Feature IDs

These are the `feature_id` strings used in the `features` table and checked by `Sidebar.js` / `FeatureGuard.js`:

**Page Features (prefix `page_`):**
`page_dashboard`, `page_sessions`, `page_students`, `page_instructors`, `page_courses`, `page_groups`, `page_schedule`, `page_support`, `page_notifications`, `page_store`, `page_finance_debts`, `page_finance_wallets`, `page_finance_expenses`, `page_audit`

**Admin items without feature gates (always visible to admins):**
`/admin/dashboard`, `/admin/staff`, `/admin/settings`

---

## 8. Roles Summary

| Role | Scope | Access |
|---|---|---|
| `super_admin` | Platform-wide | Super Admin dashboard, all admin routes, manage all centers/packages |
| `admin` | Single center | Full access to their center (all pages, all permissions, staff management) |
| `staff` | Single center | Access limited by: (1) package features, (2) individual `staff_permissions` |
| `student` | Single center | Student portal only (`/portal/*`) |
| `parent` | Single center | Parent portal only (`/parent/*`) |

---

*End of CONTEXT.md — Generated by AI Senior Architect analysis of the full codebase.*
