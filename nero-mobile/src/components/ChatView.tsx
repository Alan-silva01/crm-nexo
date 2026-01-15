import React, { useEffect, useState, useRef } from 'react';
import { supabase, getLeadDisplayName } from '../lib/supabase';
import type { Lead, Message, KanbanColumn } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { ChevronLeft, Send, CheckCircle2, X } from 'lucide-react';
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
            setChatTableName(`chats_${tableName}`);
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

        // Auto-pausar IA ao enviar mensagem
        if (!lead.ai_paused) {
            await supabase.from('leads').update({ ai_paused: true }).eq('id', lead.id);
        }

        const { data: profile } = await supabase.from('profiles').select('webhook_url').eq('id', effectiveUserId).single();
        if (profile?.webhook_url) {
            try {
                // Enviar notificação de pausa da IA junto com a mensagem
                if (!lead.ai_paused) {
                    await fetch(profile.webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ evento: 'pausar_ia', phone: lead.phone, action: 'Pausar IA' }),
                    });
                }
                // Enviar a mensagem
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

    const toggleAI = async () => {
        const newStatus = !lead.ai_paused;
        const { error } = await supabase.from('leads').update({ ai_paused: newStatus }).eq('id', lead.id);
        if (!error) {
            lead.ai_paused = newStatus;
            setMessages(prev => [...prev]); // Force re-render if needed, though state is in lead object
        }
    };

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-main)]">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-base)] bg-[var(--bg-sidebar)]/80 backdrop-blur-xl sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--border-base)] text-zinc-400 hover:text-[var(--text-main)] transition-all active:scale-90">
                        <ChevronLeft size={24} />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full p-1 border-2 border-indigo-500/30 bg-[var(--bg-card)] flex-shrink-0">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg">
                                {!lead.avatar || lead.avatar.trim() === "" || lead.avatar.includes('picsum.photos') ? (
                                    <div className="text-white font-black text-xl uppercase">
                                        {getLeadDisplayName(lead).charAt(0).toUpperCase()}
                                    </div>
                                ) : (
                                    <img
                                        src={lead.avatar}
                                        className="w-full h-full object-cover"
                                        alt=""
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).onerror = null;
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getLeadDisplayName(lead))}&background=6366f1&color=fff`;
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-black text-[var(--text-main)] truncate text-base leading-tight tracking-tight">{getLeadDisplayName(lead)}</h4>
                            <p className="text-[10px] text-zinc-500 font-medium tracking-tight mb-0.5">
                                {(() => {
                                    const p = (lead.phone || '').replace(/\D/g, '').replace(/^55/, '');
                                    return p.length >= 10
                                        ? `(${p.slice(0, 2)}) ${p.slice(2, 7)}-${p.slice(7, 11)}`
                                        : p;
                                })()}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                    {lead.assigned_to ? 'Atribuído' : 'Sem Atendente'}
                                </span>
                                <div className="flex items-center gap-1 opacity-60">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Online</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleAI}
                        className={cn(
                            "px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                            lead.ai_paused
                                ? "bg-red-500/10 border-red-500/20 text-red-500"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        )}
                    >
                        {lead.ai_paused ? 'IA OFF' : 'IA ON'}
                    </button>
                    <button
                        onClick={() => setShowStatusModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        {lead.status}
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
                {messages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: 'spring', damping: 25 }}
                            key={msg.id || idx}
                            className={cn("flex flex-col max-w-[80%]", isUser ? "self-end items-end" : "self-start items-start")}
                        >
                            <div className={cn(
                                "px-5 py-3.5 text-[14px] leading-relaxed shadow-xl transition-all",
                                isUser
                                    ? "bg-indigo-600 text-white rounded-[24px] rounded-tr-none shadow-indigo-600/20"
                                    : "bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-base)] rounded-[24px] rounded-tl-none shadow-sm"
                            )}>
                                {msg.content}
                            </div>
                            <div className="flex items-center gap-2 mt-2 px-1">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isUser && <CheckCircle2 size={12} className="text-indigo-500" />}
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <footer className="p-6 bg-transparent sticky bottom-0 z-30">
                <div className="max-w-xl mx-auto flex items-end gap-3 bg-[var(--bg-card)]/90 backdrop-blur-2xl border border-[var(--border-base)] rounded-[32px] p-2 pr-3 group focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all shadow-2xl">
                    <textarea
                        className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] text-[var(--text-main)] placeholder:text-zinc-600 py-3.5 px-4 max-h-32 min-h-[40px] resize-none overflow-hidden"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Escreva sua mensagem..."
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
                        className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 disabled:opacity-50 disabled:grayscale transition-all active:scale-90 hover:scale-105 mb-0.5"
                    >
                        {sending ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send size={22} />}
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
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-md bg-[var(--bg-sidebar)]/95 backdrop-blur-2xl border-t border-[var(--border-base)] rounded-t-[48px] px-8 pt-10 pb-12 shadow-2xl z-[101]"
                        >
                            <div className="w-16 h-1.5 bg-[var(--border-base)] rounded-full mx-auto mb-10 shadow-inner" />
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Alterar Status</h3>
                                    <p className="text-xs font-black text-indigo-500 uppercase tracking-widest leading-none mt-1">Mover lead no funil</p>
                                </div>
                                <button onClick={() => setShowStatusModal(false)} className="w-12 h-12 flex items-center justify-center bg-[var(--border-base)] rounded-full text-zinc-400 hover:text-[var(--text-main)] active:scale-90 transition-all"><X size={24} /></button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
                                {columns.map((col) => (
                                    <button
                                        key={col.id}
                                        onClick={() => changeStatus(col.name)}
                                        className={cn(
                                            "flex items-center justify-between p-6 rounded-[32px] border transition-all active:scale-[0.98] animate-slide-up",
                                            lead.status === col.name
                                                ? "bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-600/20 text-white"
                                                : "bg-[var(--bg-card)] border-[var(--border-base)] text-zinc-500 hover:text-[var(--text-main)] hover:bg-[var(--border-base)]"
                                        )}
                                    >
                                        <span className="text-sm font-black uppercase tracking-widest">{col.name}</span>
                                        {lead.status === col.name && <CheckCircle2 size={22} />}
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
