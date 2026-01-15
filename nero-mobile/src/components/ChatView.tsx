import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead, Message, KanbanColumn } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { ChevronLeft, Send, User, CheckCircle2, MoreVertical, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface ChatViewProps {
    lead: Lead;
    onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ lead, onBack }) => {
    const { effectiveUserId } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [columns, setColumns] = useState<KanbanColumn[]>([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [chatTableName, setChatTableName] = useState<string | null>(null);

    useEffect(() => {
        fetchChatTableName();
        fetchColumns();
    }, [effectiveUserId]);

    useEffect(() => {
        if (chatTableName) {
            fetchMessages();
            subscribeToMessages();
        }
    }, [chatTableName, lead.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchChatTableName = async () => {
        if (!effectiveUserId) return;
        const { data } = await supabase.from('profiles').select('company_name').eq('id', effectiveUserId).single();
        if (data?.company_name) {
            const tableName = data.company_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            setChatTableName(`chat_${tableName}`);
        }
    };

    const fetchColumns = async () => {
        if (!effectiveUserId) return;
        const { data } = await supabase.from('kanban_columns').select('*').eq('user_id', effectiveUserId).order('position');
        if (data) setColumns(data);
    };

    const fetchMessages = async () => {
        if (!chatTableName || !lead.phone) return;
        const customerId = (lead as any).customer_id || lead.phone;
        const { data } = await supabase.from(chatTableName).select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
        if (data) {
            setMessages(data.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender as 'user' | 'client',
                timestamp: msg.created_at,
            })));
        }
    };

    const subscribeToMessages = () => {
        if (!chatTableName) return;
        const channel = supabase.channel(`chat-${lead.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: chatTableName }, (payload) => {
            const msg = payload.new as any;
            setMessages(prev => [...prev, { id: msg.id, content: msg.content, sender: msg.sender, timestamp: msg.created_at }]);
        }).subscribe();
        return () => { supabase.removeChannel(channel); };
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        const { data: profile } = await supabase.from('profiles').select('webhook_url').eq('id', effectiveUserId).single();
        if (profile?.webhook_url) {
            try {
                await fetch(profile.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: lead.phone, message: newMessage, lead_id: lead.id, sender: 'user' }),
                });
            } catch (error) { console.error('Error sending message:', error); }
        }
        if (chatTableName) {
            const customerId = (lead as any).customer_id || lead.phone;
            await supabase.from(chatTableName).insert({ customer_id: customerId, content: newMessage, sender: 'user' });
        }
        setNewMessage('');
        setSending(false);
    };

    const changeStatus = async (newStatus: string) => {
        await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
        lead.status = newStatus;
        setShowStatusModal(false);
    };

    return (
        <div className="flex flex-col h-screen bg-[#0c0c0e] light:bg-[#f8f9fa]">
            {/* Header */}
            <header className="px-4 py-3 flex items-center gap-3 border-b border-white/5 light:border-black/5 bg-[#09090b]/90 backdrop-blur-md">
                <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>

                <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 light:bg-zinc-200 flex items-center justify-center overflow-hidden border border-white/5 light:border-black/5 shadow-lg">
                        {lead.avatar ? <img src={lead.avatar} className="w-full h-full object-cover" alt="" /> : <User className="text-zinc-600" size={18} />}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-white light:text-black truncate text-sm leading-tight">{lead.name}</h4>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Online</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => setShowStatusModal(true)} className="px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                        {lead.status}
                    </button>
                    <button className="p-2 rounded-xl text-zinc-400"><MoreVertical size={20} /></button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {messages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <motion.div
                            initial={{ opacity: 0, x: isUser ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={msg.id || idx}
                            className={cn("flex flex-col max-w-[85%]", isUser ? "self-end items-end" : "self-start items-start")}
                        >
                            <div className={cn(
                                "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-lg",
                                isUser
                                    ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10"
                                    : "bg-zinc-900 light:bg-white text-zinc-200 light:text-black border border-white/5 light:border-black/5 rounded-tl-none"
                            )}>
                                {msg.content}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                                <span className="text-[9px] font-medium text-zinc-600 uppercase">
                                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isUser && <CheckCircle2 size={10} className="text-zinc-700" />}
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <footer className="p-4 bg-[#09090b]/80 backdrop-blur-md border-t border-white/5 light:border-black/5 safe-area-bottom">
                <div className="flex items-end gap-2 bg-zinc-900/50 light:bg-white border border-white/5 light:border-black/5 rounded-[24px] p-2 pr-3 group focus-within:ring-2 focus-within:ring-indigo-600/30 transition-all">
                    <textarea
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[13px] text-white light:text-black placeholder:text-zinc-600 py-2.5 px-3 max-h-32 min-h-[40px] resize-none overflow-hidden"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Mensagem..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 mb-0.5"
                    >
                        {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={18} />}
                    </button>
                </div>
            </footer>

            {/* Status Transition Modal */}
            <AnimatePresence>
                {showStatusModal && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowStatusModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-sm bg-[#0c0c0e] border-t border-white/10 rounded-t-[32px] p-8 shadow-2xl"
                        >
                            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white tracking-tight">Mover Lead</h3>
                                <button onClick={() => setShowStatusModal(false)} className="p-2 bg-white/5 rounded-full text-zinc-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                                {columns.map((col) => (
                                    <button
                                        key={col.id}
                                        onClick={() => changeStatus(col.name)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                            lead.status === col.name
                                                ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20 text-white"
                                                : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900"
                                        )}
                                    >
                                        <span className="text-sm font-bold uppercase tracking-wider">{col.name}</span>
                                        {lead.status === col.name && <CheckCircle2 size={18} />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
