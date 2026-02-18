'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdminAction } from '../auth-actions'; // تأكد إن المسار صح
import { FaEye, FaEyeSlash, FaGraduationCap, FaSpinner } from 'react-icons/fa';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    
    // استدعاء السيرفر أكشن
    const result = await loginAdminAction(formData);

// ... داخل handleSubmit ...
    if (result?.error) {
      setErrorMsg(result.error);
      setLoading(false);
    } else {
      // ✅ تنظيف الـ LocalStorage القديم عشان لو فيه ID لسنتر قديم ميحصلش تداخل
      localStorage.removeItem("active_center_id"); 
      
      const targetPath = result.role === 'staff' ? '/admin/staff_dashboard' : '/admin/dashboard';
      
      // التوجيه
      window.location.href = targetPath; 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Professional Business Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900">
        {/* Professional Spotlight */}
        <div className="absolute inset-0 bg-gradient-radial from-blue-400/15 via-transparent to-transparent"></div>
        
        {/* Business Floating Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-gradient-to-br from-blue-300/25 to-indigo-400/20 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-gradient-to-br from-purple-300/25 to-violet-400/20 rounded-full blur-3xl opacity-40 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-br from-indigo-300/20 to-blue-400/15 rounded-full blur-2xl opacity-30 animate-pulse delay-500"></div>
        
        {/* Business/Educational Symbols */}
        <div className="absolute top-20 left-20 text-blue-400/15 text-6xl font-bold animate-pulse">📊</div>
        <div className="absolute top-40 right-32 text-blue-400/12 text-5xl font-bold animate-pulse delay-1000">💼</div>
        <div className="absolute bottom-32 left-40 text-blue-400/10 text-6xl font-bold animate-pulse delay-500">📈</div>
        <div className="absolute top-60 left-1/2 text-blue-400/15 text-5xl font-bold animate-pulse">🎯</div>
        <div className="absolute bottom-20 right-20 text-blue-400/12 text-6xl font-bold animate-pulse">⚡</div>
        <div className="absolute top-1/3 right-1/4 text-blue-400/10 text-5xl font-bold animate-pulse delay-700">🏢</div>
      </div>
      
      {/* Enterprise Crystal Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Professional Inner Light/Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/30 via-indigo-200/15 to-transparent rounded-[3rem] opacity-60"></div>
        
        <div className="relative bg-gradient-to-br from-purple-100/30 to-violet-100/10 backdrop-blur-xl border-2 border-blue-400/30 w-full p-10 rounded-[3rem] shadow-2xl shadow-purple-300/30 animate-in fade-in zoom-in duration-500">
          
          {/* Professional Logo & Title */}
          <div className="text-center mb-8">
            <div className="relative w-28 h-28 mx-auto mb-6">
              {/* Animated Educational Logo */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-full flex items-center justify-center shadow-2xl shadow-blue-400/40 animate-bounce-slow">
                <FaGraduationCap className="text-white text-5xl animate-pulse-slow" />
              </div>
            </div>
            
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent mb-2" style={{ fontFamily: 'Tajawal, sans-serif' }}>
              Smart Center
            </h1>
            <p className="text-blue-200/90 text-sm font-bold mb-1">منظومة تعليمية متكاملة لإدارة المستقبل</p>
            <p className="text-purple-200/80 text-xs font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>الحل الأمثل للمراكز التعليمية</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50/90 backdrop-blur border-2 border-red-200/60 rounded-2xl text-red-800 text-sm font-bold text-center shadow-lg shadow-red-100/50">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-black text-blue-400 mb-3 pr-2 flex items-center gap-2">
                <span className="text-lg">📧</span> البريد الإلكتروني
              </label>
              <input 
                name="email" type="email" required 
                className="w-full p-4 bg-white/90 backdrop-blur border-2 border-blue-400/40 focus:bg-white focus:border-blue-400 focus:shadow-lg focus:shadow-blue-200/50 rounded-2xl outline-none transition-all font-bold text-sm text-purple-900 placeholder-purple-400 shadow-inner"
                placeholder="admin@smart-center.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-black text-blue-400 mb-3 pr-2 flex items-center gap-2">
                <span className="text-lg">🔐</span> كلمة المرور
              </label>
              <div className="relative">
                <input 
                  name="password" 
                  type={showPassword ? "text" : "password"} required
                  className="w-full p-4 bg-white/90 backdrop-blur border-2 border-blue-400/40 focus:bg-white focus:border-blue-400 focus:shadow-lg focus:shadow-blue-200/50 rounded-2xl outline-none transition-all font-bold text-sm text-purple-900 placeholder-purple-400 shadow-inner"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500 hover:text-blue-400 transition-colors">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            
            <button 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-400/30 hover:shadow-xl hover:shadow-indigo-300/40 transition-all active:scale-95 flex items-center justify-center gap-3 mt-8 text-lg"
            >
              {loading ? <FaSpinner className="animate-spin text-white" /> : 
                <><span className="text-lg">🏢</span> دخول لنظام الإدارة</>
              }
            </button>
          </form>
          
          {/* Business Footer */}
          <div className="mt-8 text-center">
            <p className="text-blue-200/60 text-xs font-bold mb-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>🚀 نظام  متخصص للإدارة التعليمية</p>
            <p className="text-purple-200/50 text-[10px] font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>© 2026Smart Center - Enterprise Educational Management</p>
          </div>
        </div>
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}