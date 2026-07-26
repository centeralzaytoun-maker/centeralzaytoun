const { execSync } = require('child_process');
const fs = require('fs');

const PROJECT_REF = "qngdkkhnvkvgskfxnerh"; // كود مشروعك

console.log("🚀 جاري محاولة الرفع بطريقة الـ Legacy اليدوية...");

try {
    // 1. محاولة الرفع بدون التحقق من الـ Bundling المحلي
    execSync(`npx supabase functions deploy send-class-reminders --project-ref ${PROJECT_REF} --no-verify-jwt`, { stdio: 'inherit' });
    
    console.log("✅ تمت عملية الرفع بنجاح!");
} catch (error) {
    console.error("❌ فشل الرفع التلقائي، جاري محاولة الـ Force Deploy...");
    // محاولة أخيرة بإجبار السيرفر على قبول الملف كما هو
    try {
        execSync(`npx supabase functions deploy send-class-reminders --import-map supabase/functions/import_map.json`, { stdio: 'inherit' });
    } catch (e) {
        console.log("⚠️ السيرفر مازال يرفض الروابط الخارجية.");
    }
}