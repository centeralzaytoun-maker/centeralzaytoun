'use client';
import { useEffect, useState, useRef } from 'react';
import { FaChalkboardTeacher, FaCheckCircle, FaPhoneAlt, FaHeadset, FaUser, FaUserGraduate, FaFileArchive, FaSpinner } from 'react-icons/fa';
import * as htmlToImage from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import JsBarcode from 'jsbarcode';

// مكوّن الباركود لحل مشكلة CORS أثناء عمل سكرين شوت
function StudentBarcode({ value }) {
    const svgRef = useRef(null);
    useEffect(() => {
        if (svgRef.current && value) {
            JsBarcode(svgRef.current, value, {
                format: "CODE128",
                displayValue: false,
                margin: 0,
                width: 3,
                height: 60,
                background: "#ffffff"
            });
        }
    }, [value]);
    return <svg ref={svgRef} className="w-full h-20 object-contain"></svg>;
}

export default function PrintCardsPage() {
    const [students, setStudents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 100; // تقسيم لـ 100 كارنيه في الدفعة الواحدة
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
            const totalPages = Math.ceil(students.length / pageSize);
            document.title = `طباعة الكارنيهات - دفعة ${currentPage} من ${totalPages} (${students.length} طالب)`;
        }
    }, [students, currentPage]);

    const totalPages = Math.ceil(students.length / pageSize);
    const currentStudents = students.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                <div className="no-print p-4 bg-white shadow-sm flex items-center justify-between mb-4 sticky top-0 z-50 flex-wrap gap-4">
                    <h1 className="text-xl font-bold text-gray-800">طباعة دفعة كارنيهات ({students.length} طالب)</h1>
                    <div className="flex gap-4 items-center">
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition"
                                >السابق</button>
                                <span className="font-bold text-gray-700 text-sm">دفعة {currentPage} من {totalPages}</span>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition"
                                >التالي</button>
                            </div>
                        )}
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
                    {currentStudents.map((student, index) => (
                        <div key={student.id || index} className="id-card-wrapper">
                            {/* الكارنيه */}
                            <div 
                                className="id-card-element w-[450px] h-[270px] border-[2px] border-emerald-600 rounded-2xl overflow-hidden bg-white flex flex-col text-right shadow-md relative" 
                                dir="rtl"
                                data-student-name={student.name}
                                data-student-id={student.unique_id}
                            >
                                
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
                                            <StudentBarcode value={student.unique_id} />
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
                    ))}
                </div>
            </div>
        </>
    );
}
