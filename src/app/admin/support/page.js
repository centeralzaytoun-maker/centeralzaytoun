'use client';
import { useState, useEffect, useRef } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { 
    FaPaperPlane, FaSearch, FaUserCircle, FaCheckDouble, 
    FaClock, FaCircle, FaSpinner, FaInbox 
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';

export default function SupportChatPage() {
    const { centerId, user } = useAuth();
    
    const [tickets, setTickets] = useState([]); // قائمة المحادثات
    const [selectedTicket, setSelectedTicket] = useState(null); // المحادثة المفتوحة حالياً
    const [messages, setMessages] = useState([]); // رسايل المحادثة المفتوحة
    const [newMessage, setNewMessage] = useState(''); // النص اللي بتكتبه
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null); 

    // WhatsApp Features State
    const [isParentTyping, setIsParentTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const currentChannelRef = useRef(null); 
    const [isSending, setIsSending] = useState(false);
    const lastTypingSignalRef = useRef(0); // 🔥 لمنع إغراق السيرفر بالإشارات 
    // ---------------------------

    // 1️⃣ تحميل البيانات الأولية
    useEffect(() => {
        const initData = async () => {
            if (!centerId) return;
            await fetchTickets();
            setLoading(false);
        };

        if (centerId) {
            initData();
        }

        // 🔥 Realtime Subscription لقائمة التذاكر
        // أي حد يبعت رسالة جديدة، القائمة تتحدث فوراً
        const ticketsChannel = supabaseBrowser
            .channel('public:support_tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
                if (centerId) fetchTickets(); // تحديث القائمة
            })
            .subscribe();

        return () => { supabaseBrowser.removeChannel(ticketsChannel); };
    }, [centerId]);

    // 2️⃣ جلب قائمة التذاكر مرتبة بالأحدث
    const fetchTickets = async () => {
        if (!centerId) return;
        
        const { data } = await supabaseBrowser
            .from('support_tickets')
            .select(`
                *,
                students (id, name, grade)
            `)
            .eq('center_id', centerId)
            .order('last_message_at', { ascending: false }); // الأحدث فوق
        setTickets(data || []);
    };

    // 3️⃣ عند اختيار تذكرة (فتح الشات)
    useEffect(() => {
        if (!selectedTicket) return;

        // هات الرسايل القديمة
        const fetchMessages = async () => {
            if (!centerId) return;
            
            const { data } = await supabaseBrowser
                .from('chat_messages')
                .select('*')
                .eq('ticket_id', selectedTicket.id)
                .eq('center_id', centerId)
                .order('created_at', { ascending: true }); // من القديم للجديد
            setMessages(data || []);
            scrollToBottom();
        };

        fetchMessages();

        // 🔥 Realtime Subscription للرسايل والإشارات (Typing / Status)
        const chatChannel = supabaseBrowser.channel(`ticket:${selectedTicket.id}`);
        currentChannelRef.current = chatChannel;

        chatChannel
            .on('postgres_changes', { 
                event: '*', // Listen to INSERT and UPDATE
                schema: 'public', 
                table: 'chat_messages', 
                filter: `ticket_id=eq.${selectedTicket.id}` 
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newMsg = payload.new;
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id || (newMsg.client_side_id && m.client_side_id === newMsg.client_side_id))) {
                            return prev;
                        }
                        return [...prev, newMsg];
                    });
                    scrollToBottom();
                    if (newMsg.sender_type !== 'staff') {
                        new Audio('/notification.mp3').play().catch(() => {});
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const updatedMsg = payload.new;
                    setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.typing) {
                    setIsParentTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsParentTyping(false), 3000);
                }
            })
            .subscribe((status) => {
                console.log(`🔌 [Realtime] حالة قناة التذكرة ${selectedTicket.id}:`, status);
            });

        return () => { 
            if (currentChannelRef.current) {
                supabaseBrowser.removeChannel(currentChannelRef.current);
                currentChannelRef.current = null;
            }
        };
    }, [selectedTicket]);

    // ✅ تحديث حالة القراءة والنزول لأسفل
    useEffect(() => {
        if (selectedTicket && messages.length > 0) {
            // أ) تعليم الرسائل كمقروءة
            const markAsRead = async () => {
                if (!centerId) return;
                
                await supabaseBrowser
                    .from('chat_messages')
                    .update({ is_read: true })
                    .eq('ticket_id', selectedTicket.id)
                    .eq('center_id', centerId)
                    .eq('sender_type', 'student')
                    .eq('is_read', false);
            };
            markAsRead();

            // ب) النزول لأسفل
            scrollToBottom();
        }
    }, [selectedTicket, messages]);

    // دالة النزول لآخر الشات
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // ⌨️ إشارة الأدمن يكتب الآن (مع حماية Throttling)
    const sendTypingSignal = () => {
        if (!selectedTicket || !currentChannelRef.current) return;
        
        const now = Date.now();
        if (now - lastTypingSignalRef.current < 2000) return; 

        lastTypingSignalRef.current = now;
        console.log("⌨️ [Typing] إرسال إشارة 'الأدمن يكتب'...");
        
        currentChannelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { typing: true }
        });
    };

    // 4️⃣ إرسال رسالة جديدة
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !selectedTicket) return;

        const msgText = newMessage;
        setNewMessage(''); 
        setIsSending(true);

        const tempId = crypto.randomUUID();
        const optimisticMsg = {
            id: tempId,
            client_side_id: tempId,
            ticket_id: selectedTicket.id,
            sender_id: user.id,
            sender_type: 'staff',
            message_text: msgText,
            is_read: false,
            center_id: centerId,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        try {
            const { error } = await supabaseBrowser.from('chat_messages').insert({
                ticket_id: selectedTicket.id,
                sender_id: user.id,
                sender_type: 'staff',
                message_text: msgText,
                is_read: false,
                center_id: centerId,
                client_side_id: tempId
            });
            
            if (error) throw error;

            // إشارة فورية (WhatsApp Logic)
            if (currentChannelRef.current) {
                await currentChannelRef.current.send({
                    type: 'broadcast',
                    event: 'admin_reply',
                    payload: optimisticMsg
                });
            }
        } catch (error) {
            console.error("❌ Send Error:", error);
            setMessages(prev => prev.filter(m => m.client_side_id !== tempId));
        } finally {
            setIsSending(false);
        }
    };

    // 🔥 5️⃣ دالة حذف التذكرة نهائياً عند الإغلاق
    const closeTicket = async () => {
        if (!selectedTicket) return;
        
        const confirmDelete = window.confirm("سيتم إغلاق المحادثة وحذفها نهائياً. هل أنت متأكد؟");
        if (!confirmDelete) return;

        try {
            // 1. حذف الرسائل أولاً (لو مش CASCADE)
            await supabaseBrowser.from('chat_messages').delete().eq('ticket_id', selectedTicket.id);

            // 2. حذف التذكرة
            const { error } = await supabaseBrowser
                .from('support_tickets')
                .delete()
                .eq('id', selectedTicket.id);

            if (error) throw error;

            setTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
            setSelectedTicket(null); 
            
        } catch (error) {
            console.error("Error deleting ticket:", error);
            alert("حدث خطأ أثناء الحذف");
        }
    };

    // التحقق من وجود centerId قبل عرض المحتوى
    if (!centerId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-bold text-gray-400">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                    <p>جاري التحقق من صلاحيات الدخول...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 " dir="rtl">
            
            {/* 🟢 القائمة الجانبية (Sidebar) */}
            <div className="w-1/3 border-l border-gray-200 bg-white flex flex-col">
                {/* Header */}
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">
                        <FaInbox className="text-blue-600"/> المحادثات
                    </h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
                        {tickets.length} نشطة
                    </span>
                </div>

                {/* Search (شكل بس حالياً) */}
                <div className="p-3">
                    <div className="relative">
                        <FaSearch className="absolute right-3 top-3 text-gray-400 text-sm"/>
                        <input type="text" placeholder="بحث عن ولي أمر..." className="w-full bg-gray-100 p-2 pr-9 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100 transition-all"/>
                    </div>
                </div>

                {/* Tickets List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center p-10"><FaSpinner className="animate-spin text-blue-600"/></div>
                    ) : tickets.map(ticket => (
                        <div 
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className={`p-4 border-b cursor-pointer transition-all hover:bg-blue-50 ${selectedTicket?.id === ticket.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-sm text-gray-900">{ticket.students?.name}</h3>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(ticket.last_message_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500 line-clamp-1 w-3/4">
                                    {ticket.subject || 'اضغط للمراسلة...'}
                                </p>
                                {ticket.status === 'open' && <FaCircle className="text-[8px] text-green-500"/>}
                            </div>
                            <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-2 inline-block">
                                {ticket.students?.grade}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 🔵 منطقة الشات (Chat Area) */}
            <div className="flex-1 flex flex-col bg-[#eef1f6]">
                {selectedTicket ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <FaUserCircle size={24}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{selectedTicket.students?.name}</h3>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <FaCircle size={6}/> متصل (ولي الأمر)
                                    </p>
                                </div>
                            </div>
                            {/* 🔥 تم ربط الزرار بدالة الإغلاق */}
                            <button 
                                onClick={closeTicket}
                                className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 font-bold transition-all"
                            >
                                إغلاق التذكرة
                            </button>
                        </div>

                        {/* Messages Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', opacity: 0.95}}>
                            {messages.map((msg, index) => {
                                const isStaff = msg.sender_type === 'staff';
                                return (
                                    <div key={index} className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[75%] p-3.5 px-5 rounded-[1.5rem] shadow-sm relative text-sm font-medium leading-relaxed ${
                                            isStaff 
                                            ? 'bg-blue-600 text-white rounded-tr-none shadow-md' 
                                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                        }`}>
                                            {msg.message_text}
                                            <div className={`text-[9px] mt-1.5 flex items-center gap-1.5 ${isStaff ? 'justify-start text-blue-100/80' : 'justify-end text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                {isStaff && (
                                                    <FaCheckDouble className={`text-[11px] transition-colors duration-500 ${msg.is_read ? 'text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]' : 'text-blue-300/50'}`}/>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t relative">
                            {/* Typing Indicator */}
                            {isParentTyping && (
                                <div className="absolute -top-7 left-8 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-blue-50 flex items-center gap-2 animate-bounce shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-green-600">ولي الأمر يكتب الآن...</span>
                                </div>
                            )}

                            <form onSubmit={sendMessage} className="flex items-center gap-3">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        sendTypingSignal();
                                    }}
                                    placeholder="اكتب ردك هنا..." 
                                    className="flex-1 bg-gray-50 p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all font-bold text-sm border border-gray-100"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim() || isSending}
                                    className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95"
                                >
                                    <FaPaperPlane className={newMessage ? "" : "opacity-50"}/>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    // Empty State
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <FaPaperPlane size={64} className="mb-4 opacity-20"/>
                        <p className="text-lg font-bold">اختر محادثة للبدء</p>
                    </div>
                )}
            </div>
        </div>
    );
}