export default function AdminLoading() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-2xl rotate-45"></div>
        <div className="absolute inset-0 border-4 border-blue-600 rounded-2xl rotate-45 border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
        </div>
      </div>
      <p className="text-sm font-black text-slate-500 animate-pulse font-cairo">جاري جلب البيانات الإدارية...</p>
    </div>
  );
}
