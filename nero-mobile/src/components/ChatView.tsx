import React, { useEffect, useState, useRef } from 'react';
import { supabase, getLeadDisplayName } from '../lib/supabase';
import type { Lead, Message, KanbanColumn } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { ChevronLeft, Send, CheckCircle2, X, Bot, User, UserPlus, Pause, Play, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { formatPhoneNumber } from '../lib/formatPhone';

interface TenantMember {
    id: string;
    user_id: string;
    nome: string;
    email: string;
    role: string;
}

interface ChatViewProps {
    lead: Lead;
    onBack: () => void;
    onLeadUpdate?: (updatedLead: Lead) => void;
}

// Clean content from wrapper
function cleanContent(content: string): string {
    let cleaned = content;
    const jsonWrapperMatch = cleaned.match(/\{["\\s]*o cliente falou:\\s*([^}]+)\}/i);
    if (jsonWrapperMatch) cleaned = jsonWrapperMatch[1];
    cleaned = cleaned.replace(/^["\\s]*o cliente falou:\\s*/i, '');
    cleaned = cleaned.replace(/^["'\\s]+|["'\\s]+$/g, '');
    cleaned = cleaned.replace(/^\{+|\}+$/g, '');
    cleaned = cleaned.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n');
    if (/^[\\.\\s]+$/.test(cleaned)) return '';
    return cleaned.trim();
}

// Format message date
function formatMessageDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';

    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
        return date.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
    }
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

function getDateKey(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

export const ChatView: React.FC<ChatViewProps> = ({ lead, onBack, onLeadUpdate }) => {
    const { effectiveUserId, userType, userInfo } = useAuth();
    const [currentLead, setCurrentLead] = useState<Lead>(lead);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [columns, setColumns] = useState<KanbanColumn[]>([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [tenantMembers, setTenantMembers] = useState<TenantMember[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [chatTableName, setChatTableName] = useState<string | null>(null);

    // Sync lead prop changes
    useEffect(() => {
        setCurrentLead(lead);
    }, [lead]);

    useEffect(() => {
        fetchChatTableName();
        fetchColumns();
        if (userInfo?.isOwnerOrAdmin) {
            fetchTenantMembers();
        }
    }, [effectiveUserId, userInfo]);

    useEffect(() => {
        if (chatTableName) {
            fetchMessages();
            const unsubscribe = subscribeToMessages();
            return unsubscribe;
        }
    }, [chatTableName, currentLead.id]);

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

    const fetchTenantMembers = async () => {
        if (!effectiveUserId) return;
        const { data } = await supabase
            .from('tenant_users')
            .select('id, user_id, nome, email, role')
            .eq('tenant_id', effectiveUserId)
            .eq('ativo', true)
            .order('nome');
        if (data) setTenantMembers(data);
    };

    const fetchMessages = async () => {
        if (!chatTableName || !currentLead.phone) return;
        const customerId = (currentLead as any).customer_id || currentLead.phone;
        const { data } = await supabase.from(chatTableName).select('*').eq('customer_id', customerId).order('created_at', { ascending: true });
        if (data) {
            setMessages(data.map((msg: any) => ({
                id: msg.id,
                content: cleanContent(msg.content),
                sender: msg.sender as 'user' | 'client',
                timestamp: msg.created_at,
            })).filter(m => m.content));
        }
    };

    const subscribeToMessages = () => {
        if (!chatTableName) return () => { };
        const channel = supabase.channel(`chat-mobile-${currentLead.id}`).on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: chatTableName },
            (payload) => {
                const msg = payload.new as any;
                const cleaned = cleanContent(msg.content);
                if (cleaned) {
                    setMessages(prev => [...prev, { id: msg.id, content: cleaned, sender: msg.sender, timestamp: msg.created_at }]);
                }
            }
        ).subscribe();
        return () => { supabase.removeChannel(channel); };
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);

        // Auto-pause AI when sending message
        if (!currentLead.ai_paused) {
            await supabase.from('leads').update({ ai_paused: true }).eq('id', currentLead.id);
            setCurrentLead(prev => ({ ...prev, ai_paused: true }));
        }

        const { data: profile } = await supabase.from('profiles').select('webhook_url').eq('id', effectiveUserId).single();
        if (profile?.webhook_url) {
            try {
                if (!currentLead.ai_paused) {
                    await fetch(profile.webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ evento: 'pausar_ia', phone: currentLead.phone, action: 'Pausar IA' }),
                    });
                }
                await fetch(profile.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentLead.phone, message: newMessage, lead_id: currentLead.id, sender: 'user' }),
                });
            } catch (error) { console.error('Error sending message:', error); }
        }

        if (chatTableName) {
            const customerId = (currentLead as any).customer_id || currentLead.phone;
            await supabase.from(chatTableName).insert({ customer_id: customerId, content: newMessage, sender: 'user' });
        }
        setNewMessage('');
        setSending(false);
    };

    const changeStatus = async (newStatus: string) => {
        await supabase.from('leads').update({ status: newStatus }).eq('id', currentLead.id);
        setCurrentLead(prev => ({ ...prev, status: newStatus }));
        setShowStatusModal(false);
    };

    const toggleAI = async () => {
        const newStatus = !currentLead.ai_paused;
        const { error } = await supabase.from('leads').update({ ai_paused: newStatus }).eq('id', currentLead.id);
        if (!error) {
            setCurrentLead(prev => ({ ...prev, ai_paused: newStatus }));

            // Send webhook notification
            const { data: profile } = await supabase.from('profiles').select('webhook_url').eq('id', effectiveUserId).single();
            if (profile?.webhook_url) {
                await fetch(profile.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        evento: newStatus ? 'pausar_ia' : 'ativar_ia',
                        phone: currentLead.phone,
                        action: newStatus ? 'Pausar IA' : 'Ativar IA'
                    }),
                }).catch(console.error);
            }
        }
    };

    const assignToMember = async (memberId: string | null) => {
        const { error } = await supabase.from('leads').update({ assigned_to: memberId }).eq('id', currentLead.id);
        if (!error) {
            setCurrentLead(prev => ({ ...prev, assigned_to: memberId }));
            setShowAssignModal(false);
        }
    };

    // Group messages by date
    const groupedMessages: { date: string; label: string; messages: Message[] }[] = [];
    let currentDateKey = '';
    messages.forEach(msg => {
        const dateKey = getDateKey(msg.timestamp);
        if (dateKey !== currentDateKey) {
            currentDateKey = dateKey;
            groupedMessages.push({ date: dateKey, label: formatMessageDate(msg.timestamp), messages: [msg] });
        } else {
            groupedMessages[groupedMessages.length - 1].messages.push(msg);
        }
    });

    const assignedMember = tenantMembers.find(m => m.id === currentLead.assigned_to);

    return (
        <div className="flex flex-col h-full bg-[var(--bg-main)]">
            {/* Header */}
            <header className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border-base)] bg-[var(--bg-sidebar)] safe-area-top">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border-base)] text-[var(--text-secondary)] active:scale-95 transition-transform"
                >
                    <ChevronLeft size={22} />
                </button>

                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg flex-shrink-0">
                        <span className="text-white font-black text-lg">
                            {getLeadDisplayName(currentLead).charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[var(--text-main)] truncate text-sm">{getLeadDisplayName(currentLead)}</h4>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">{formatPhoneNumber(currentLead.phone)}</p>
                    </div>
                </div>

                {/* AI Toggle */}
                <button
                    onClick={toggleAI}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 active:scale-95 transition-all",
                        currentLead.ai_paused
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    )}
                >
                    {currentLead.ai_paused ? <Pause size={12} /> : <Play size={12} />}
                    {currentLead.ai_paused ? 'OFF' : 'ON'}
                </button>
            </header>

            {/* Action Bar */}
            <div className="px-4 py-2 flex items-center gap-2 border-b border-[var(--border-base)] bg-[var(--bg-card)]">
                <button
                    onClick={() => setShowStatusModal(true)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-base)] text-[11px] font-bold text-[var(--text-main)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    {currentLead.status || 'Novo Lead'}
                </button>

                {userInfo?.isOwnerOrAdmin && (
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-base)] text-[11px] font-bold text-[var(--text-main)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <UserPlus size={14} className="text-[var(--text-muted)]" />
                        {assignedMember ? assignedMember.nome.split(' ')[0] : 'Atribuir'}
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {groupedMessages.map((group, groupIdx) => (
                    <div key={group.date}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                            <div className="px-4 py-1.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-base)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider shadow-sm">
                                {group.label}
                            </div>
                        </div>

                        {/* Messages */}
                        {group.messages.map((msg, idx) => {
                            const isUser = msg.sender === 'user';
                            return (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', damping: 25, delay: idx * 0.02 }}
                                    key={msg.id || `${group.date}-${idx}`}
                                    className={cn("flex mb-3", isUser ? "justify-end" : "justify-start")}
                                >
                                    <div className={cn(
                                        "max-w-[80%] px-4 py-3 text-[14px] leading-relaxed",
                                        isUser
                                            ? "bg-[var(--bubble-sent)] text-[var(--bubble-sent-text)] rounded-[20px] rounded-br-md shadow-lg shadow-indigo-500/10"
                                            : "bg-[var(--bubble-received)] text-[var(--bubble-received-text)] border border-[var(--bubble-received-border)] rounded-[20px] rounded-bl-md"
                                    )}>
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        <div className={cn(
                                            "flex items-center gap-1.5 mt-1.5",
                                            isUser ? "justify-end" : "justify-start"
                                        )}>
                                            <span className={cn(
                                                "text-[10px] font-medium",
                                                isUser ? "text-white/60" : "text-[var(--text-muted)]"
                                            )}>
                                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isUser && <CheckCircle2 size={12} className="text-white/60" />}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <footer className="p-4 bg-[var(--bg-sidebar)] border-t border-[var(--border-base)] safe-area-bottom">
                <div className="flex items-end gap-3 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-[24px] p-2 pr-3 shadow-lg">
                    <textarea
                        className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[14px] text-[var(--text-main)] placeholder:text-[var(--text-muted)] py-2.5 px-3 max-h-28 min-h-[36px] resize-none"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px';
                        }}
                        placeholder="Digite sua mensagem..."
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
                        className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:shadow-none transition-all active:scale-90"
                    >
                        {sending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Send size={18} />
                        )}
                    </button>
                </div>
            </footer>

            {/* Status Modal */}
            <AnimatePresence>
                {showStatusModal && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowStatusModal(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-[var(--bg-sidebar)] border-t border-[var(--border-base)] rounded-t-[32px] px-6 pt-6 pb-10 shadow-2xl z-[101] safe-area-bottom"
                        >
                            <div className="w-12 h-1 bg-[var(--border-strong)] rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-main)]">Alterar Status</h3>
                                <button onClick={() => setShowStatusModal(false)} className="w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-base)] rounded-full text-[var(--text-muted)] active:scale-90 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">
                                {columns.map((col) => (
                                    <button
                                        key={col.id}
                                        onClick={() => changeStatus(col.name)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                            currentLead.status === col.name
                                                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                                                : "bg-[var(--bg-card)] border-[var(--border-base)] text-[var(--text-main)]"
                                        )}
                                    >
                                        <span className="text-sm font-bold">{col.name}</span>
                                        {currentLead.status === col.name && <CheckCircle2 size={18} />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Assign Modal */}
            <AnimatePresence>
                {showAssignModal && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAssignModal(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-[var(--bg-sidebar)] border-t border-[var(--border-base)] rounded-t-[32px] px-6 pt-6 pb-10 shadow-2xl z-[101] safe-area-bottom"
                        >
                            <div className="w-12 h-1 bg-[var(--border-strong)] rounded-full mx-auto mb-6" />
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-[var(--text-main)]">Atribuir Atendimento</h3>
                                <button onClick={() => setShowAssignModal(false)} className="w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-base)] rounded-full text-[var(--text-muted)] active:scale-90 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto no-scrollbar">
                                {/* Remove assignment option */}
                                <button
                                    onClick={() => assignToMember(null)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                        !currentLead.assigned_to
                                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                            : "bg-[var(--bg-card)] border-[var(--border-base)] text-[var(--text-muted)]"
                                    )}
                                >
                                    <span className="text-sm font-bold">Sem atribuição</span>
                                    {!currentLead.assigned_to && <CheckCircle2 size={18} />}
                                </button>

                                {tenantMembers.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => assignToMember(member.id)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                            currentLead.assigned_to === member.id
                                                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                                                : "bg-[var(--bg-card)] border-[var(--border-base)] text-[var(--text-main)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
                                                <span className="text-white font-bold text-sm">{member.nome.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold">{member.nome}</p>
                                                <p className={cn("text-[11px]", currentLead.assigned_to === member.id ? "text-white/60" : "text-[var(--text-muted)]")}>{member.role}</p>
                                            </div>
                                        </div>
                                        {currentLead.assigned_to === member.id && <CheckCircle2 size={18} />}
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
