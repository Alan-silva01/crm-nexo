import React, { useEffect, useState } from 'react';
import { supabase, getLeadDisplayName } from '../lib/supabase';
import type { Lead } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { Search, RefreshCw, MessageSquare, Bot, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { formatPhoneNumber } from '../lib/formatPhone';

interface ChatListProps {
    onSelectLead: (lead: Lead) => void;
    selectedLeadId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectLead, selectedLeadId }) => {
    const { effectiveUserId, atendenteId, userType } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLeads = async (isRefresh = false) => {
        if (!effectiveUserId) return;
        if (isRefresh) setRefreshing(true);

        let query = supabase
            .from('leads')
            .select('*')
            .eq('user_id', effectiveUserId)
            .order('updated_at', { ascending: false });

        if (userType === 'atendente' && atendenteId) {
            query = query.eq('assigned_to', atendenteId);
        }

        const { data, error } = await query;
        if (!error && data) setLeads(data);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchLeads();
        const channel = supabase
            .channel('leads-mobile-realtime')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${effectiveUserId}` },
                () => fetchLeads()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [effectiveUserId, atendenteId]);

    const filteredLeads = leads.filter(lead => {
        const displayName = getLeadDisplayName(lead).toLowerCase();
        const phone = lead.phone.toLowerCase();
        const search = searchTerm.toLowerCase();
        return displayName.includes(search) || phone.includes(search);
    });

    // Format relative time
    const formatRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-main)]">
            <div className="px-5 pt-6 pb-4 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black tracking-tight text-[var(--text-main)]">Conversas</h2>
                    <button
                        onClick={() => fetchLeads(true)}
                        disabled={refreshing}
                        className={cn(
                            "w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-card)] border border-[var(--border-base)] text-[var(--text-muted)] transition-all active:scale-90",
                            refreshing && "animate-spin"
                        )}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar conversas..."
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-28">
                {filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div className="w-16 h-16 bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                            <MessageSquare className="text-[var(--text-muted)]" size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">Nenhuma conversa</h3>
                        <p className="text-[var(--text-muted)] text-sm">Suas conversas aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredLeads.map((lead, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03, type: 'spring', damping: 25 }}
                                key={lead.id}
                                onClick={() => onSelectLead(lead)}
                                className={cn(
                                    "flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98]",
                                    selectedLeadId === lead.id
                                        ? "bg-indigo-600 shadow-lg shadow-indigo-600/20"
                                        : "bg-[var(--bg-card)] border border-[var(--border-base)]"
                                )}
                            >
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className={cn(
                                        "w-14 h-14 rounded-full flex items-center justify-center text-lg font-black",
                                        selectedLeadId === lead.id
                                            ? "bg-white/20 text-white"
                                            : "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
                                    )}>
                                        {getLeadDisplayName(lead).charAt(0).toUpperCase()}
                                    </div>
                                    {/* Online indicator */}
                                    <div className={cn(
                                        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 bg-emerald-500",
                                        selectedLeadId === lead.id ? "border-indigo-600" : "border-[var(--bg-card)]"
                                    )}></div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className={cn(
                                            "font-bold text-[15px] truncate",
                                            selectedLeadId === lead.id ? "text-white" : "text-[var(--text-main)]"
                                        )}>
                                            {getLeadDisplayName(lead)}
                                        </h4>
                                        <span className={cn(
                                            "text-[11px] font-semibold flex-shrink-0 ml-2",
                                            selectedLeadId === lead.id ? "text-white/60" : "text-[var(--text-muted)]"
                                        )}>
                                            {formatRelativeTime(lead.updated_at || lead.created_at)}
                                        </span>
                                    </div>

                                    <p className={cn(
                                        "text-[13px] truncate mb-2",
                                        selectedLeadId === lead.id ? "text-white/70" : "text-[var(--text-secondary)]"
                                    )}>
                                        {lead.last_message || formatPhoneNumber(lead.phone)}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide",
                                            selectedLeadId === lead.id
                                                ? "bg-white/20 text-white"
                                                : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                                        )}>
                                            {lead.status || 'Novo'}
                                        </span>

                                        {lead.ai_paused && (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1",
                                                selectedLeadId === lead.id
                                                    ? "bg-red-400/20 text-red-200"
                                                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                                            )}>
                                                <Pause size={10} /> IA
                                            </span>
                                        )}

                                        {lead.assigned_to && (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide",
                                                selectedLeadId === lead.id
                                                    ? "bg-emerald-400/20 text-emerald-200"
                                                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                            )}>
                                                Atribuído
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
