# 📋 دليل نظام صلاحيات الموظفين

## 🎯 نظرة عامة

تم تطوير نظام جديد للتحكم في صلاحيات الوصول للصفحات الإدارية للموظفين. يسمح هذا النظام لمدير النظام بتحديد الموظفين الذين يمكنهم الوصول إلى كل صفحة على حدة.

## 📊 الصفحات المتحكم فيها

يمكن الآن التحكم في الوصول للصفحات التالية:

| المسار | اسم الصلاحية | الوصف |
|--------|-------------|-------|
| `/admin/staff_dashboard` | `page_staff_dashboard` | لوحة تحكم الموظفين الرئيسية |
| `/admin/sessions` | `page_sessions` | إدارة الحصص والجلسات |
| `/admin/students` | `page_students` | قائمة الطلاب وبياناتهم |
| `/admin/instructors` | `page_instructors` | إدارة المدرسين |
| `/admin/courses` | `page_courses` | المواد الدراسية |
| `/admin/groups` | `page_groups` | إدارة المجموعات الدراسية |
| `/admin/schedule` | `page_schedule` | الجدول الدراسي |
| `/admin/finance/debts` | `page_finance_debts` | المديونيات المالية |

## 🔧 كيفية الاستخدام

### 1. منح الصلاحيات

1. اذهب إلى صفحة `/admin/staff/permissions`
2. اختر الموظف من القائمة الجانبية
3. فعّل الصفحات المسموح للموظف بالوصول إليها
4. اضغط على "تحديث الصلاحيات"

### 2. التحقق التلقائي

- عندما يحاول الموظف الوصول إلى صفحة، يتم التحقق تلقائياً من صلاحياته
- إذا لم يكن لديه صلاحية، يتم عرض رسالة "الوصول ممنوع"
- يتم إعادة التوجيه تلقائياً إلى لوحة التحكم الرئيسية بعد 3 ثوانٍ

## 🏗️ الهيكل التقني

### قاعدة البيانات

```sql
-- جدول الصلاحيات
permissions (key, name, description, group_key)

-- جدول صلاحيات الموظفين  
staff_permissions (staff_id, center_id, permission_key)

-- جدول الميزات
features (id, name, description)
```

### المكونات البرمجية

1. **StaffPageGuard** - مكون للتحقق من الصلاحيات قبل عرض الصفحة
2. **staffPermissions.js** - دوال مساعدة للتحقق من الصلاحيات
3. **API Endpoint** - `/api/staff-permissions` لإدارة الصلاحيات

## 🔄 خطوات التثبيت

### 1. تشغيل الترحيل (Migration)

```bash
# قم بتشغيل ملف SQL التالي على قاعدة البيانات
database-migrations/add_staff_page_permissions.sql
```

### 2. تحديث الصفحات

تم تحديث جميع الصفحات المذكورة أعلاه لتشمل `StaffPageGuard` مع الصلاحية المناسبة.

### 3. الاختبار

```bash
# تشغيل اختبار النظام
node test_staff_permissions.js
```

## 🛡️ قواعد الأمان

1. **Super Admin** لديه وصول كامل لجميع الصفحات تلقائياً
2. **Admin** لديه وصول كامل لجميع الصفحات تلقائياً (مثل Super Admin)
3. **Staff** يتم التحقق من صلاحياته لكل صفحة على حدة
4. يتم عزل الصلاحيات حسب المركز (`center_id`)

## 📝 أمثلة الاستخدام

### إضافة حماية لصفحة جديدة

```javascript
import StaffPageGuard from '../../../components/StaffPageGuard';

export default function NewPage() {
  return (
    <StaffPageGuard requiredPermission="page_new_feature">
      <div>
        {/* محتوى الصفحة */}
      </div>
    </StaffPageGuard>
  );
}
```

### التحقق من الصلاحيات برمجياً

```javascript
import { hasStaffPagePermission } from '../../../lib/staffPermissions';

const canAccess = await hasStaffPagePermission(
  staffId, 
  'page_students', 
  centerId
);
```

## 🚀 المميزات

- ✅ تحكم دقيق في الوصول لكل صفحة
- ✅ واجهة سهلة لإدارة الصلاحيات
- ✅ حماية تلقائية للصفحات
- ✅ دعم متعدد المراكز
- ✅ رسائل واضحة للمستخدمين
- ✅ إعادة توجيه تلقائي عند عدم الصلاحية

## 🔧 استكشاف الأخطاء

### مشكلة: الموظف لا يستطيع الوصول لصفحة

1. تحقق من وجود الصلاحية في جدول `permissions`
2. تحقق من منح الصلاحية للموظف في `staff_permissions`
3. تأكد من أن `center_id` صحيح

### مشكلة: الصفحة تعرض خطأ

1. تحقق من استيراد `StaffPageGuard`
2. تأكد من تمرير `requiredPermission` الصحيح
3. تحقق من سجلات المتصفح للأخطاء

## 📞 الدعم

في حال وجود أي مشاكل، تواصل مع فريق الدعم الفني.
