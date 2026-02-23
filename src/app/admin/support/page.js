'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabaseBrowser } from '../../../lib/supabase';
import { 
    FaPaperPlane, FaSearch, FaUserCircle, FaCheckDouble, 
    FaClock, FaCircle, FaSpinner, FaInbox, FaArrowLeft, FaEllipsisV, 
    FaTrash, FaCheck, FaPhone, FaBook, FaInfoCircle, FaBolt, FaFilter, FaLayerGroup, FaBell
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function SupportChatPage() {
    const { centerId, user } = useAuth();
    
    // 📊 State Management
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, unread, open
    const [showInfoSidebar, setShowInfoSidebar] = useState(true);
    const [showMobileChat, setShowMobileChat] = useState(false);
    
    // ⚙️ Chat Engine Refs
    const messagesEndRef = useRef(null); 
    const typingTimeoutRef = useRef(null);
    const currentChannelRef = useRef(null); 
    const lastTypingSignalRef = useRef(0);
    const processingIds = useRef(new Set());

    // 🏎️ UI States
    const [isParentTyping, setIsParentTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // 🧠 Quick Replies (Canned Responses)
    const quickReplies = [
        "أهلاً بك، كيف يمكنني مساعدتك؟",
        "تم حل المشكلة، هل لديك استفسار آخر؟",
        "جاري التحقق من الأمر، برجاء الانتظار قليلاً.",
        "سيتم التواصل معك هاتفياً لمزيد من التفاصيل.",
        "تم تحديث البيانات بنجاح."
    ];

    // 📥 Initial Data Fetch
    useEffect(() => {
        if (centerId) {
            fetchInitialData();
            setupRealtimeSubscriptions();
        }
    }, [centerId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await fetchTickets();
        } catch (e) {
            toast.error('خطأ في تحميل المحادثات');
        } finally {
            setLoading(false);
        }
    };

    const fetchTickets = async () => {
        if (!centerId) return;
        const { data } = await supabaseBrowser
            .from('support_tickets')
            .select(`*, students (id, name, grade, phone, group_ids)`)
            .eq('center_id', centerId)
            .order('last_message_at', { ascending: false });
        setTickets(data || []);
    };

    const setupRealtimeSubscriptions = () => {
        const ticketsChannel = supabaseBrowser
            .channel('public:support_tickets_admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `center_id=eq.${centerId}` }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => { supabaseBrowser.removeChannel(ticketsChannel); };
    };

    // 💬 Handle Ticket Selection & Messages
    useEffect(() => {
        if (!selectedTicket) return;

        const fetchMessagesAndSubscribe = async () => {
            // 1. Fetch historical messages
            const { data } = await supabaseBrowser
                .from('chat_messages')
                .select('*')
                .eq('ticket_id', selectedTicket.id)
                .order('created_at', { ascending: true });
            
            setMessages(data || []);
            scrollToBottom();

            // 2. Clear unread notifications for this ticket
            markTicketAsRead(selectedTicket.id);

            // 3. Setup Ticket Realtime Room
            if (currentChannelRef.current) supabaseBrowser.removeChannel(currentChannelRef.current);
            
            const chatChannel = supabaseBrowser.channel(`ticket_room:${selectedTicket.id}`);
            currentChannelRef.current = chatChannel;

            chatChannel
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'chat_messages', 
                    filter: `ticket_id=eq.${selectedTicket.id}` 
                }, (payload) => {
                    const newMsg = payload.new;
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id || (newMsg.client_side_id && m.client_side_id === newMsg.client_side_id))) return prev;
                        return [...prev, newMsg];
                    });
                    scrollToBottom();
                    if (newMsg.sender_type !== 'staff') {
                        new Audio('/notification.mp3').play().catch(() => {});
                        markTicketAsRead(selectedTicket.id);
                    }
                })
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload.typing) {
                        setIsParentTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsParentTyping(false), 3000);
                    }
                })
                .subscribe();
        };

        fetchMessagesAndSubscribe();

        return () => { 
            if (currentChannelRef.current) {
                supabaseBrowser.removeChannel(currentChannelRef.current);
                currentChannelRef.current = null;
            }
        };
    }, [selectedTicket?.id]);

    const markTicketAsRead = async (ticketId) => {
        await supabaseBrowser
            .from('chat_messages')
            .update({ is_read: true })
            .eq('ticket_id', ticketId)
            .eq('sender_type', 'student')
            .eq('is_read', false);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // ⌨️ Actions
    const sendTypingSignal = () => {
        if (!selectedTicket || !currentChannelRef.current) return;
        const now = Date.now();
        if (now - lastTypingSignalRef.current < 2000) return; 
        lastTypingSignalRef.current = now;
        currentChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { typing: true } });
    };

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !user || !selectedTicket || isSending) return;

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
        } catch (error) {
            toast.error('فشل إرسال الرسالة');
            setMessages(prev => prev.filter(m => m.client_side_id !== tempId));
        } finally {
            setIsSending(false);
        }
    };

    const closeTicket = async () => {
        if (!selectedTicket) return;
        const confirm = window.confirm("هل أنت متأكد من إغلاق وحذف هذه المحادثة؟");
        if (!confirm) return;

        try {
            await supabaseBrowser.from('chat_messages').delete().eq('ticket_id', selectedTicket.id);
            const { error } = await supabaseBrowser.from('support_tickets').delete().eq('id', selectedTicket.id);
            if (error) throw error;
            
            setTickets(prev => prev.filter(t => t.id !== selectedTicket.id));
            setSelectedTicket(null);
            setShowMobileChat(false);
            toast.success('تم إغلاق المحادثة بنجاح');
        } catch (error) {
            toast.error('خطأ أثناء الإغلاق');
        }
    };

    // 🔍 Filtering Logic
    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            const matchesSearch = t.students?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTab = activeTab === 'all' || 
                              (activeTab === 'unread' && t.unread_count > 0) ||
                              (activeTab === 'open' && t.status === 'open');
            return matchesSearch && matchesTab;
        });
    }, [tickets, searchTerm, activeTab]);

    if (!centerId) return (
        <div className="h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold">جاري المصادقة...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-cairo" dir="rtl">
            <Toaster position="top-center" />

            {/* 📁 Sidebar: Ticket List */}
            <div className={`w-full md:w-[380px] lg:w-[420px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-xl transition-all ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-slate-100 bg-white sticky top-0">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <FaInbox size={18} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">الدعم الفني</h2>
                        </div>
                        <div className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full border border-blue-100 uppercase tracking-tighter">
                            {tickets.length} تذكرة
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative group">
                            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-all" />
                            <input 
                                type="text" 
                                placeholder="بحث عن اسم الطالب..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none h-12 pr-12 pl-4 rounded-2xl text-xs font-black outline-none focus:ring-2 ring-blue-500/10 transition-all"
                            />
                        </div>

                        <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                            {[
                                { id: 'all', label: 'الكل', icon: <FaLayerGroup /> },
                                { id: 'unread', label: 'لم يُقرأ', icon: <FaBell /> },
                                { id: 'open', label: 'نشط', icon: <FaBolt /> },
                            ].map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-3 opacity-20">
                            <FaSpinner className="animate-spin text-3xl"/>
                            <p className="text-xs font-black">جاري التحميل...</p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-30 text-center">
                            <FaInbox size={48} />
                            <p className="text-sm font-black">لا توجد محادثات مطابقة</p>
                        </div>
                    ) : filteredTickets.map(ticket => (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={ticket.id}
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setShowMobileChat(true);
                            }}
                            className={`p-5 cursor-pointer transition-all border-b border-slate-50 relative group ${selectedTicket?.id === ticket.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                        >
                            {selectedTicket?.id === ticket.id && <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-600 rounded-r-full shadow-[2px_0_10px_rgba(37,99,235,0.4)]"></div>}
                            
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${selectedTicket?.id === ticket.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white transition-all'}`}>
                                        {ticket.students?.name?.[0]}
                                    </div>
                                    {ticket.status === 'open' && (
                                        <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-500 border-4 border-white rounded-full"></div>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-black text-sm text-slate-800 truncate">{ticket.students?.name}</h3>
                                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap mr-2">
                                            {new Date(ticket.last_message_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate font-bold opacity-80 mb-2">
                                        {ticket.subject || 'بدء محادثة دعم جديدة...'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black border border-slate-200 uppercase tracking-tighter">
                                            {ticket.students?.grade}
                                        </span>
                                        {ticket.unread_count > 0 && (
                                            <span className="bg-red-500 text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-lg shadow-red-200">
                                                {ticket.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* 💬 Main Chat View */}
            <div className={`flex-1 flex flex-col bg-[#f0f4f8] relative ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                {selectedTicket ? (
                    <>
                        {/* 🏢 Chat Header */}
                        <div className="h-[80px] bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-30">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <button 
                                    onClick={() => setShowMobileChat(false)}
                                    className="md:hidden w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all shrink-0"
                                >
                                    <FaArrowLeft />
                                </button>
                                
                                <div className="flex items-center gap-3 truncate">
                                    <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                                        <FaUserCircle size={28}/>
                                    </div>
                                    <div className="truncate">
                                        <h3 className="font-black text-slate-800 text-base leading-none mb-1.5 truncate">{selectedTicket.students?.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">متاح للمراسلة</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showInfoSidebar ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <FaInfoCircle size={18} />
                                </button>
                                <button 
                                    onClick={closeTicket}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-black shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all transform active:scale-95"
                                >
                                    إنهاء المحادثة
                                </button>
                            </div>
                        </div>

                        {/* ✉️ Messages Content */}
                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 flex flex-col bg-opacity-70 backdrop-blur-3xl relative overflow-hidden" 
                                 style={{
                                     backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232563eb' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                                 }}>
                                
                                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar">
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((msg, idx) => {
                                            const isStaff = msg.sender_type === 'staff';
                                            return (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    key={msg.id || idx} 
                                                    className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}
                                                >
                                                    <div className={`max-w-[85%] md:max-w-[70%] group relative`}>
                                                        <div className={`p-4 md:p-5 rounded-[2.5rem] text-sm font-bold leading-relaxed shadow-sm transition-all ${
                                                            isStaff 
                                                            ? 'bg-white text-slate-800 rounded-tr-none border border-slate-100 hover:shadow-md' 
                                                            : 'bg-blue-600 text-white rounded-tl-none shadow-xl shadow-blue-200/50'
                                                        }`}>
                                                            {msg.message_text}
                                                            
                                                            <div className={`text-[9px] mt-2.5 flex items-center gap-2 ${isStaff ? 'justify-end text-slate-400' : 'justify-start text-blue-100/70'}`}>
                                                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                {isStaff && (
                                                                    <FaCheckDouble className={`text-[10px] ${msg.is_read ? 'text-blue-500' : 'text-slate-200'}`}/>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* ⌨️ Input Panel */}
                                <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-30">
                                    {/* Quick Replies */}
                                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                                        {quickReplies.map((reply, i) => (
                                            <button 
                                                key={i}
                                                onClick={() => { setNewMessage(reply); }}
                                                className="whitespace-nowrap bg-slate-50 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black border border-slate-100 transition-all text-slate-500"
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Input Form */}
                                    <div className="relative">
                                        {/* Typing Label */}
                                        <AnimatePresence>
                                            {isParentTyping && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute -top-12 right-0 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full flex items-center gap-3 shadow-sm"
                                                >
                                                    <div className="flex gap-1">
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                                    </div>
                                                    <span className="text-[10px] font-black">ولي الأمر يكتب الآن...</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <form onSubmit={sendMessage} className="flex gap-4">
                                            <div className="flex-1 relative">
                                                <input 
                                                    type="text" 
                                                    value={newMessage}
                                                    onChange={(e) => {
                                                        setNewMessage(e.target.value);
                                                        sendTypingSignal();
                                                    }}
                                                    placeholder="اكتب ردك هنا للعضو..." 
                                                    className="w-full h-16 bg-slate-50 border-none rounded-[2rem] px-8 text-sm font-bold outline-none focus:ring-4 ring-blue-500/5 focus:bg-white transition-all"
                                                />
                                            </div>
                                            <motion.button 
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                type="submit" 
                                                disabled={!newMessage.trim() || isSending}
                                                className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-slate-200 disabled:opacity-50 transition-all"
                                            >
                                                {isSending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane size={20} className={newMessage ? "text-blue-400" : "opacity-30"}/>}
                                            </motion.button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* ℹ️ Info Sidebar (Desktop Only) */}
                            <AnimatePresence>
                                {showInfoSidebar && (
                                    <motion.div 
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 340, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="hidden xl:flex flex-col bg-white border-r border-slate-100 overflow-hidden shrink-0 shadow-lg"
                                    >
                                        <div className="p-8 text-center border-b border-slate-50">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center text-3xl font-black text-slate-300 shadow-inner">
                                                {selectedTicket.students?.name?.[0]}
                                            </div>
                                            <h4 className="font-black text-slate-800 text-lg mb-1">{selectedTicket.students?.name}</h4>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedTicket.students?.grade}</p>
                                        </div>

                                        <div className="p-8 space-y-8">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">بيانات التواصل</label>
                                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm"><FaPhone size={14}/></div>
                                                    <span className="text-sm font-black text-slate-700">{selectedTicket.students?.phone || 'غير مسجل'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">المجموعة الحالية</label>
                                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm"><FaBook size={14}/></div>
                                                    <span className="text-xs font-black text-slate-700">طالب في {selectedTicket.students?.group_ids?.length || 0} مجموعات</span>
                                                </div>
                                            </div>

                                            <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                                                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-all duration-700"></div>
                                                <h5 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">سرعة الرد</h5>
                                                <p className="text-xs font-bold leading-relaxed">أثبتت الإحصائيات أن الرد في أقل من 5 دقائق يزيد من معدل ثقة ولي الأمر بنسبة 80%</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                        <div className="w-40 h-40 bg-white rounded-[4rem] flex items-center justify-center text-slate-100 shadow-2xl shadow-blue-50 border border-slate-50 mb-10 group relative">
                             <div className="absolute inset-0 bg-blue-600 rounded-[4rem] opacity-0 group-hover:opacity-10 scale-0 group-hover:scale-110 transition-all duration-700"></div>
                             <FaInbox size={80} className="relative z-10 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">مركز الدعم والمحادثات</h3>
                        <p className="text-slate-400 max-w-sm font-bold leading-relaxed mb-10">اختر محادثة من القائمة الجانبية لبدء التواصل مع أولياء الأمور وحل استفساراتهم بشكل فوري.</p>
                        <div className="flex gap-4">
                           <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                               <span className="text-[10px] font-black text-slate-500 uppercase">نظام البث المباشر مفعل</span>
                           </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
                .font-cairo { font-family: 'Cairo', sans-serif; }
                
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}