export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Icon / Logo */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-4 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shadow-inner">
            <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <h2 className="text-xl font-black text-slate-800 animate-pulse">جاري التحميل...</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Classora Smart Pulse</p>
        </div>
      </div>
    </div>
  );
}
