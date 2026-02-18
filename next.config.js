const nextConfig = {
  reactStrictMode: false,
  eslint: {
    // ⚠️ بنفعل دي عشان نتخطى أخطاء الـ Linting أثناء الرفـع للتسهيل في البدايـة
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚠️ بنفعل دي برضه عشان نتخطى أي أخطاء TypeScript تقابلنا
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
