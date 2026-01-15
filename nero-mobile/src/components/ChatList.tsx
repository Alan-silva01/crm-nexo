import React, { useEffect, useState } from 'react';
import { supabase, getLeadDisplayName } from '../lib/supabase';
import type { Lead } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { Search, RefreshCw, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface ChatListProps {
    onSelectLead: (lead: Lead) => void;
    selectedLeadId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectLead, selectedLeadId }) => {
    const { effectiveUserId, atendenteId, userType } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLeads = async () => {
        if (!effectiveUserId) return;

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
    };

    useEffect(() => {
        fetchLeads();
        const channel = supabase
            .channel('leads-mobile')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${effectiveUserId}` },
                () => fetchLeads()
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [effectiveUserId]);

    const filteredLeads = leads.filter(lead => {
        const displayName = getLeadDisplayName(lead).toLowerCase();
        const phone = lead.phone.toLowerCase();
        const search = searchTerm.toLowerCase();
        return displayName.includes(search) || phone.includes(search);
    });

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-main)]">
            <div className="px-6 pt-8 pb-4 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black tracking-tight text-[var(--text-main)]">Mensagens</h2>
                    <button
                        onClick={() => { setLoading(true); fetchLeads(); }}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--border-base)] text-zinc-400 hover:text-indigo-500 transition-all active:rotate-180"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Pesquisar conversas..."
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-base)] rounded-2xl py-4 pl-12 pr-4 text-sm text-[var(--text-main)] placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 shadow-inner transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Active Leads "Stories" */}
                {leads.length > 0 && (
                    <div className="space-y-3">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest ml-1">Ativos agora</span>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                            <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                <div className="w-16 h-16 rounded-full p-1 border-2 border-dashed border-indigo-500/30 flex items-center justify-center bg-[var(--bg-card)]">
                                    <div className="w-full h-full rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                                        <span className="text-2xl">+</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase">Novo</span>
                            </div>
                            {leads.slice(0, 5).map(lead => (
                                <div key={`story-${lead.id}`} className="flex flex-col items-center gap-2 flex-shrink-0">
                                    <div className="w-16 h-16 rounded-full p-1 border-2 border-indigo-500 flex items-center justify-center bg-[var(--bg-card)]">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700">
                                            {!lead.avatar || lead.avatar.trim() === "" ? (
                                                <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                                                    {getLeadDisplayName(lead).charAt(0).toUpperCase()}
                                                </div>
                                            ) : (
                                                <img
                                                    src={lead.avatar}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).onerror = null;
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=6366f1&color=fff`;
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-[var(--text-main)] uppercase truncate w-16 text-center">{getLeadDisplayName(lead).split(' ')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-10">
                <div className="px-2 mb-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Conversas Recentes</span>
                </div>
                {filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6 animate-scale-in">
                        <div className="w-20 h-20 bg-[var(--bg-card)] rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-[var(--border-base)]">
                            <MessageSquare className="text-zinc-700" size={40} />
                        </div>
                        <h3 className="text-xl font-black text-[var(--text-main)] mb-2">Nenhuma conversa</h3>
                        <p className="text-zinc-500 text-sm max-w-[200px]">Comece uma nova conversa para gerenciar seus leads.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredLeads.map((lead, idx) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
                                key={lead.id}
                                onClick={() => onSelectLead(lead)}
                                className={cn(
                                    "group flex items-center gap-4 p-4 rounded-[32px] cursor-pointer transition-all active:scale-[0.98] animate-scale-in",
                                    selectedLeadId === lead.id
                                        ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20"
                                        : "bg-[var(--bg-card)] hover:bg-[var(--bg-card)] border border-[var(--border-base)] shadow-sm"
                                )}
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 border-[var(--border-base)] bg-[var(--bg-main)]">
                                        {!lead.avatar || lead.avatar.trim() === "" ? (
                                            <div className={cn(
                                                "w-full h-full flex items-center justify-center text-xl font-black transition-colors",
                                                selectedLeadId === lead.id ? "bg-white/10 text-white" : "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
                                            )}>
                                                {getLeadDisplayName(lead).charAt(0).toUpperCase()}
                                            </div>
                                        ) : (
                                            <img
                                                src={lead.avatar}
                                                className="w-full h-full object-cover"
                                                alt=""
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).onerror = null;
                                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=6366f1&color=fff`;
                                                }}
                                            />
                                        )}
                                    </div>
                                    {/* Status Indicator */}
                                    <div className={cn(
                                        "absolute bottom-0 right-0 w-5 h-5 border-4 rounded-full bg-emerald-500",
                                        selectedLeadId === lead.id ? "border-indigo-600" : "border-[var(--bg-card)]"
                                    )}></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className={cn(
                                            "font-black text-base truncate tracking-tight transition-colors",
                                            selectedLeadId === lead.id ? "text-white" : "text-[var(--text-main)]"
                                        )}>{getLeadDisplayName(lead)}</h4>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            selectedLeadId === lead.id ? "text-white/60" : "text-zinc-500"
                                        )}>
                                            {new Date(lead.updated_at || lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-xs truncate mb-2 transition-colors",
                                        selectedLeadId === lead.id ? "text-white/80" : "text-zinc-500"
                                    )}>{lead.last_message || 'Inicie uma conversa...'}</p>
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors",
                                            selectedLeadId === lead.id
                                                ? "bg-white/10 border-white/20 text-white"
                                                : "bg-[var(--bg-main)]/50 border-[var(--border-base)] text-zinc-400"
                                        )}>
                                            {lead.status}
                                        </div>
                                        {lead.ai_paused && (
                                            <div className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-red-500/10 border border-red-500/20 text-red-500 uppercase tracking-widest">
                                                IA OFF
                                            </div>
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
