'use client';
import { useEffect, useState, useRef } from 'react';
import { FaChalkboardTeacher, FaCheckCircle, FaPhoneAlt, FaHeadset, FaUser, FaUserGraduate, FaFileArchive, FaSpinner } from 'react-icons/fa';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import JsBarcode from 'jsbarcode';

// مكوّن الباركود لحل مشكلة CORS أثناء عمل سكرين شوت
function StudentBarcode({ value }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (canvasRef.current && value) {
            JsBarcode(canvasRef.current, value, {
                format: "CODE128",
                displayValue: false,
                margin: 0,
                width: 2,
                height: 40,
                background: "#ffffff"
            });
        }
    }, [value]);
    return <canvas ref={canvasRef} className="w-full h-10 object-contain"></canvas>;
}

export default function PrintCardsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [centerConfig, setCenterConfig] = useState(null);
    const [isZipping, setIsZipping] = useState(false);

    useEffect(() => {
        const storedData = localStorage.getItem('print_cards_data');

        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                
                setStudents(parsedData.students || []);
                setCenterConfig(parsedData.center);
                setLoading(false);

                // Optional: remove after reading
                // localStorage.removeItem('print_cards_data');

            } catch (err) {
                console.error("Error parsing print data:", err);
                setError(true);
                setLoading(false);
            }
        } else {
            setError(true);
            setLoading(false);
        }
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadZip = async () => {
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const elements = document.querySelectorAll('.id-card-element');
            
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const studentName = element.getAttribute('data-student-name') || `student_${i}`;
                const studentId = element.getAttribute('data-student-id') || i;
                
                // إضافة تأخير بسيط لتجنب تجميد المتصفح
                await new Promise(resolve => setTimeout(resolve, 50));
                
                const dataUrl = await htmlToImage.toJpeg(element, { 
                    quality: 0.95, 
                    pixelRatio: 2, 
                    backgroundColor: '#ffffff'
                });
                
                const base64Data = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
                
                zip.file(`${studentName}_${studentId}.jpg`, base64Data, {base64: true});
            }
            
            const content = await zip.generateAsync({type: "blob"});
            saveAs(content, "students_cards.zip");
            
        } catch (error) {
            console.error("Error generating ZIP:", error);
            alert("حدث خطأ أثناء إنشاء الملف المضغوط");
        } finally {
            setIsZipping(false);
        }
    };

    // إزالة الطباعة التلقائية لأن المستخدم قد يرغب في التنزيل بدلاً من ذلك
    useEffect(() => {
        if (students.length > 0) {
            document.title = `طباعة الكارنيهات (${students.length} طالب)`;
        }
    }, [students]);

    if (error) return <div className="p-10 text-center text-red-500 font-bold">❌ عذراً، لم يتم العثور على بيانات الطلاب (يرجى المحاولة من لوحة التحكم).</div>;
    if (loading) return <div className="p-10 text-center font-bold text-blue-600 animate-pulse text-xl">جاري تجهيز الكارنيهات...</div>;

    return (
        <>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                
                body { 
                    font-family: 'Cairo', sans-serif;
                    background: #f3f4f6;
                }
                
                * { 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                }
                
                .cards-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
                    gap: 20px;
                    justify-items: center;
                    padding: 20px;
                }

                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .cards-container {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 15px !important;
                        padding: 0 !important;
                    }

                    .id-card-wrapper {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        margin-bottom: 10px;
                    }
                    
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                }
            `}</style>

            <div className="flex flex-col min-h-screen" dir="rtl">
                <div className="no-print p-4 bg-white shadow-sm flex items-center justify-between mb-4 sticky top-0 z-50">
                    <h1 className="text-xl font-bold text-gray-800">طباعة دفعة كارنيهات ({students.length} طالب)</h1>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleDownloadZip} 
                            disabled={isZipping}
                            className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:bg-emerald-400 disabled:cursor-not-allowed"
                        >
                            {isZipping ? <FaSpinner className="animate-spin" /> : <FaFileArchive />} 
                            {isZipping ? "جاري التجهيز..." : "تنزيل (ZIP)"}
                        </button>
                        <button onClick={handlePrint} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <FaHeadset /> طباعة الآن
                        </button>
                        <button onClick={() => window.close()} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-bold hover:bg-gray-300 transition">
                            إغلاق
                        </button>
                    </div>
                </div>

                <div className="cards-container">
                    {students.map((student, index) => (
                        <div key={student.id || index} className="id-card-wrapper">
                            {/* الكارنيه */}
                            <div 
                                className="id-card-element w-[450px] h-[270px] border-[2px] border-blue-600 rounded-2xl overflow-hidden bg-white flex flex-col text-right shadow-md relative" 
                                dir="rtl"
                                data-student-name={student.name}
                                data-student-id={student.unique_id}
                            >
                                
                                {/* Header */}
                                <div className="bg-blue-600 h-[50px] text-white flex items-center justify-between px-5 relative z-20">
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
                                <div className="flex flex-row flex-grow relative overflow-hidden p-3 pt-1">
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                        <FaUserGraduate size={150} />
                                    </div>

                                    <div className="flex-[1.6] flex flex-col justify-between z-10 pr-1 h-full">
                                        <div>
                                            <h3 className="text-[22px] font-black text-blue-950 mb-0.5 leading-tight truncate">{student.name}</h3>
                                            <div className="flex items-center gap-2 text-blue-700 font-bold text-[11px] mb-2">
                                                <FaCheckCircle size={8} /> الصف: {student.grade}
                                            </div>
                                        </div>

                                        <div className="space-y-0.5 bg-gray-50/90 p-2 rounded-xl border border-gray-100 mb-1">
                                             <div className="flex items-center justify-between text-[10px] text-gray-700 font-bold">
                                                 <span className="flex items-center gap-1"><FaUser size={7} className="text-blue-500"/> موبايل الطالب:</span>
                                                 <span className="font-mono">{student.phone || '---'}</span>
                                             </div>
                                             <div className="flex items-center justify-between text-[10px] text-gray-700 font-bold">
                                                 <span className="flex items-center gap-1"><FaPhoneAlt size={7} className="text-green-600"/> موبايل ولي الأمر:</span>
                                                 <span className="font-mono">{student.parent_phone || '---'}</span>
                                             </div>
                                             {centerConfig?.center_phone && (
                                                <div className="flex items-center justify-between text-[10px] text-red-600 font-black border-t border-gray-200 mt-1 pt-1">
                                                    <span className="flex items-center gap-1"><FaHeadset size={8}/> تواصل مع السنتر:</span>
                                                    <span className="font-mono">{centerConfig.center_phone}</span>
                                                </div>
                                             )}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col items-center justify-center border-r border-dashed border-gray-200 pl-1 h-full bg-gray-50/50">
                                        <p className="text-[10px] font-black text-blue-600 mb-2 uppercase">بوابة الطالب</p>
                                        <div className="p-1 bg-white border border-blue-50 rounded-lg shadow-sm w-[120px]">
                                            <StudentBarcode value={student.unique_id} />
                                            <p className="text-[7px] font-mono text-center font-black text-gray-500 mt-1">{student.unique_id}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-100 h-[30px] flex items-center justify-center border-t border-gray-200">
                                    <p className="text-[10px] font-bold text-blue-600 italic">
                                        {centerConfig?.report_footer || "إدارة السنتر تتمنى لكم التوفيق"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
