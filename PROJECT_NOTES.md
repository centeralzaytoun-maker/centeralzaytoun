# 📚 Smart Center — Project Notes
> آخر تحديث: 2026-03-03

---

## 🏗️ نبذة عن المشروع
نظام إدارة مراكز تعليمية متكامل (SaaS) — **Clasora**  
**Stack:** Next.js 14 (App Router) + Supabase + Vanilla CSS  
**Git Branches:** `main` (production) · `demo-preview` (staging)  
**GitHub:** `Abdelkhalek2/classora-center`

---

## 📂 هيكل المشروع الأساسي
```
src/
├── app/
│   ├── admin/
│   │   ├── dashboard/         ← لوحة تحكم المدير (Analytics)
│   │   ├── staff/             ← إدارة الموظفين + جدول أسبوعي
│   │   │   ├── attendance/    ← تقارير الحضور اليومية والشهرية
│   │   │   └── permissions/   ← أذونات الموظفين
│   │   ├── staff_dashboard/   ← داشبورد الموظف (check-in/out)
│   │   ├── students/          ← إدارة الطلاب
│   │   ├── subscriptions/     ← الاشتراكات الشهرية
│   │   ├── finance/wallets/   ← شحن المحافظ
│   │   ├── expenses/          ← المصروفات
│   │   ├── sessions/          ← الحصص والمجموعات
│   │   ├── lessons/           ← المحتوى الرقمي (LMS)
│   │   ├── vouchers/          ← أكواد الشحن
│   │   ├── settings/          ← إعدادات السنتر (brand, logo)
│   │   └── audit/             ← سجل الرقابة
│   ├── super-admin/           ← لوحة القيادة العليا (SaaS admin)
│   ├── login/                 ← تسجيل دخول الموظفين
│   └── api/
│       ├── admin/users/       ← إنشاء/حذف موظفين (Service Role)
│       └── auth/lookup-student/ ← بحث الطالب بالـ ID
├── components/
│   ├── Sidebar.js             ← الشريط الجانبي (feature-gated)
│   ├── AuthHydrator.js        ← تحميل الـ auth context
│   └── AccessDenied.js        ← صفحة رفض الوصول
└── context/
    └── AuthContext.js         ← centerId + allowedFeatures + user
```

---

## 🗄️ جداول Supabase المهمة

| الجدول | الوصف | ملف SQL |
|--------|-------|---------|
| `centers` | السنتريات | — |
| `packages` | الباقات (max_students, max_staff) | `staff_max_limit.sql` |
| `package_features` | مميزات كل باقة | — |
| `features` | قائمة الـ features الكاملة | Super Admin: "تحديث قائمة المميزات" |
| `staff_profiles` | بيانات الموظفين | — |
| `staff_attendance` | سجل الحضور والانصراف | `staff_attendance_table.sql` |
| `staff_schedules` | الجدول الأسبوعي لكل موظف | `staff_schedules_table.sql` |
| `students` | بيانات الطلاب | — |
| `student_activities` | سجل أنشطة الطلاب | — |
| `audit_logs` | سجل العمليات | — |
| `permissions` | أذونات الموظفين | — |

---

## 🔑 نظام الـ Features (Package Gating)

### صفحات النظام (page_*)
```
page_super_admin          ← لوحة القيادة العليا
page_admin_dashboard      ← لوحة تحكم الإدارة
page_staff_dashboard      ← داشبورد الموظف
page_staff                ← إدارة الموظفين
page_staff_permissions    ← أذونات الموظفين
page_staff_attendance     ← سجل الحضور والانصراف ⭐ جديد
page_students             ← إدارة الطلاب
page_sessions             ← الحصص والمجموعات
page_subscriptions        ← الاشتراكات
page_store                ← المتجر
page_finance_wallets      ← شحن المحافظ
page_finance_expenses     ← المصروفات
page_support              ← الدعم
page_notifications        ← الإشعارات
page_settings             ← الإعدادات
page_audit                ← سجل الرقابة
page_lessons              ← المحتوى الرقمي
page_vouchers             ← أكواد الشحن
```

### تأثير page_staff_attendance:
- يظهر/يخفي رابط "سجل الحضور" في السايدبار
- يظهر/يخفي كارت الحضور في staff_dashboard
- يحمي صفحة /admin/staff/attendance

---

## ✅ ميزات نظام الحضور (آخر ما اتعمل)

### الداتابيز
```sql
-- staff_attendance: GPS + IP + device + status + manual override
-- staff_schedules:  جدول أسبوعي per-staff (يوم إجازة + وقت + tolerance)
-- packages.max_staff: حد أقصى لعدد الموظفين
```

### المنطق (staff_dashboard/page.js)
- عند الـ check-in → يجلب جدول اليوم من `staff_schedules`
- لو `is_day_off = true` → تنبيه بس يسمحله يدخل
- لو متأخر عن `expected_check_in + late_tolerance_min` → `status = 'late'`

### التقرير الشهري (staff/attendance/page.js)
- يجلب جداول الموظفين بالتوازي مع سجلات الحضور
- `expectedDays` محسوب per-staff حسب جدوله الأسبوعي
- `absent = expectedDays - presentDays`
- Excel export يشمل: حضور، غياب، أيام مجدولة، نسبة، ساعات، تأخير

---

## 🎯 Next Steps (مؤجلة)
- [ ] طلبات الإجازة (الموظف يطلب → المدير يوافق)
- [ ] Auto Check-out (Supabase Cron Job)
- [ ] ملخص شهري للموظف في داشبورده
- [ ] تكامل الرواتب مع الحضور

---

## 🔧 بيئة التطوير
```bash
cd C:\Projects\smart-center
npm run dev          # localhost:3000
git push origin main # الرئيسي
git push origin demo-preview # التجريبي
```

### Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://qngdkkhnvkvgskfxnerh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   ← مستخدم في API routes
```

---

## 📝 SQL Files المطلوب تشغيلها في Supabase
```
staff_attendance_table.sql    ← جدول الحضور الكامل
staff_schedules_table.sql     ← الجدول الأسبوعي
staff_max_limit.sql           ← حقل max_staff في packages
staff_expected_checkin.sql    ← (قديم - superseded by staff_schedules)
```
> بعد التشغيل: روح Super Admin → "تحديث قائمة المميزات" → أضف page_staff_attendance للباقات

---

## 💡 ملاحظات مهمة
- الـ Sidebar يستخدم `packageMapping` لربط feature الموظف بـ page_* للباقة
- الـ API `/api/admin/users` يتحقق من `max_staff` قبل إنشاء موظف جديد
- كل الوقت بالعربي في الـ UI (dir="rtl")
- Font: Cairo (Google Fonts)
- استخدم `supabaseBrowser` في الـ client components
- استخدم `supabaseAdmin` (Service Role) في الـ API routes
