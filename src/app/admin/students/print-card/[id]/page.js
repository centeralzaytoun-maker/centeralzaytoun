'use client';
import { useEffect, useState, useRef } from 'react';
import { FaChalkboardTeacher, FaCheckCircle, FaPhoneAlt, FaHeadset, FaUser, FaUserGraduate, FaDownload } from 'react-icons/fa';
import * as htmlToImage from 'html-to-image';
import JsBarcode from 'jsbarcode';

export default function PrintCardPage() {
    // ❌ تم حذف (params) و (useAuth) و (supabase) لعدم الحاجة إليهم
    
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [centerConfig, setCenterConfig] = useState(null);
    const barcodeRef = useRef(null);

    useEffect(() => {
        // ✅ التعديل هنا: قراءة البيانات من المتصفح مباشرة بدلاً من السيرفر
        // هذا يمنع "التعليق" في التبويبات الخلفية
        const storedData = localStorage.getItem('print_card_data');

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                
                // تحديث الحالة بالبيانات المستلمة
                setStudent(parsedData.student);
                setCenterConfig(parsedData.center);
                setLoading(false);

                // تنظيف البيانات (اختياري للأمان)
                localStorage.removeItem('print_card_data');

            } catch (err) {
                console.error("Error parsing print data:", err);
                setError(true);
                setLoading(false);
            }
        } else {
            // لو مفيش بيانات (تم فتح الصفحة مباشرة دون المرور بالداشبورد)
            setError(true);
            setLoading(false);
        }
    }, []);

    // ✅ دالة تحميل الصورة
    const handleDownloadImage = async () => {
        const element = document.getElementById('id-card');
        if (!element) return;
        
        try {
            const dataUrl = await htmlToImage.toJpeg(element, { 
                quality: 0.95, 
                pixelRatio: 2, 
                backgroundColor: '#ffffff'
            });
            
            const link = document.createElement('a');
            link.download = `${student.name}_${student.unique_id}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Error generating image:", err);
            alert("حدث خطأ أثناء حفظ الصورة");
        }
    };

    // عرض حالات التحميل والخطأ
    if (error) return <div className="p-10 text-center text-red-500 font-bold">❌ عذراً، لم يتم العثور على بيانات الطالب (يرجى المحاولة من لوحة التحكم).</div>;
    if (loading) return <div className="p-10 text-center font-bold text-blue-600 animate-pulse text-xl">جاري تجهيز الكارت...</div>;

    // 👇👇👇 التصميم كما هو تماماً (لم يتم حذف أي شيء) 👇👇👇
    return (
        <>
            {/* ✅ الـ CSS الجديد */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                
                body { 
                    font-family: 'Cairo', sans-serif;
                }
                
                * { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                }
                
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    #id-card,
                    #id-card * {
                        visibility: visible;
                    }
                    
                    #id-card {
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%, -50%);
                    }
                    
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                }
            `}</style>

            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 print:bg-white p-4">
                
                <div className="mb-6 flex gap-4 print:hidden">
                    <button onClick={handleDownloadImage} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                        <FaDownload /> تنزيل صورة الكارنيه
                    </button>
                    <button onClick={() => window.close()} className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold">
                        إغلاق
                    </button>
                </div>

                {/* الكارنيه الرئيسي */}
                <div id="id-card" className="w-[450px] h-[270px] border-[2px] border-emerald-600 rounded-2xl overflow-hidden bg-white flex flex-col text-right shadow-2xl print:shadow-none relative" dir="rtl">
                    
                    {/* Header */}
                    <div className="bg-emerald-600 h-[50px] text-white flex items-center justify-between px-5 relative z-20">
                        <div className="flex items-center gap-2">
                            {centerConfig?.logo_url ? (
                                <img 
                                    src={centerConfig.logo_url} 
                                    alt="logo" 
                                    crossOrigin="anonymous"
                                    className="h-8 w-8 object-contain bg-white rounded-lg p-0.5"
                                />
                            ) : (
                                <FaChalkboardTeacher className="text-white text-xl" />
                            )}
                            <h2 className="text-[14px] font-black uppercase tracking-wider">
                                {centerConfig?.center_name || "اسم السنتر"}
                            </h2>
                        </div>
                        <div className="flex flex-col items-center border-l border-white/30 pl-3">
                             <span className="text-[8px] font-black opacity-80 leading-none">STUDENT</span>
                             <span className="text-[10px] font-bold opacity-100 uppercase">ID CARD</span>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex flex-col flex-grow relative overflow-hidden items-center justify-center p-3 pt-4">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            <FaUserGraduate size={150} />
                        </div>

                        <div className="z-10 flex flex-col items-center justify-center w-full mt-1">
                            <div className="p-2 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm w-[320px] flex flex-col items-center mb-2">
                                <canvas ref={barcodeRef} className="h-20 w-full object-contain"></canvas>
                                <p className="text-[18px] font-mono text-center font-black text-gray-800 mt-1 tracking-widest">{student.unique_id}</p>
                            </div>
                            
                            <div className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-0.5 rounded-full font-bold text-[10px] border border-emerald-100 shadow-sm w-fit mx-auto">
                                <FaCheckCircle size={10} className="text-emerald-600" /> الصف الدراسي: {student.grade}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-100 h-[30px] flex items-center justify-center border-t border-gray-200">
                        <p className="text-[10px] font-bold text-emerald-600 italic">
                            {centerConfig?.report_footer || "إدارة السنتر تتمنى لكم التوفيق"}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}