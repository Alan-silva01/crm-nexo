import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';
import { Search, RefreshCw, MessageSquare, ChevronRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface ChatListProps {
    onSelectLead: (lead: Lead) => void;
    selectedLeadId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectLead, selectedLeadId }) => {
    const { effectiveUserId, userType, user } = useAuth();
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

        if (userType === 'atendente' && user?.id) {
            query = query.eq('atendente_id', user.id);
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

    const filteredLeads = leads.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0c0c0e] light:bg-[#f8f9fa]">
            <div className="p-4 space-y-4">
                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar conversas..."
                        className="w-full bg-zinc-900/50 light:bg-white border border-white/5 light:border-black/5 rounded-2xl py-3 pl-10 pr-4 text-sm text-white light:text-black placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recentes</span>
                    <button
                        onClick={() => { setLoading(true); fetchLeads(); }}
                        className="p-1.5 rounded-lg bg-zinc-900/50 light:bg-zinc-200 text-zinc-400 hover:text-indigo-400 transition-colors"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
                {filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                            <MessageSquare className="text-zinc-600" size={32} />
                        </div>
                        <h3 className="text-white font-semibold mb-1">Nenhuma conversa</h3>
                        <p className="text-zinc-500 text-sm">Não encontramos nenhum lead com os critérios de busca.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredLeads.map((lead, idx) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={lead.id}
                                onClick={() => onSelectLead(lead)}
                                className={cn(
                                    "group flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all active:scale-[0.98]",
                                    selectedLeadId === lead.id
                                        ? "bg-indigo-600/10 border border-indigo-600/20 shadow-lg shadow-indigo-600/5"
                                        : "hover:bg-zinc-900/30 light:hover:bg-zinc-100 border border-transparent"
                                )}
                            >
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 light:bg-zinc-200 flex items-center justify-center overflow-hidden border border-white/5 light:border-black/5">
                                        {lead.avatar ? (
                                            <img src={lead.avatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <User className="text-zinc-600" size={24} />
                                        )}
                                    </div>
                                    {/* Status Indicator */}
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0c0c0e] rounded-full"></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className="font-bold text-white light:text-black truncate">{lead.name}</h4>
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{new Date(lead.updated_at || lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate mb-1">{lead.last_message || 'Sem histórico de mensagens'}</p>
                                    <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-900/80 light:bg-zinc-200 border border-white/5 light:border-black/5">
                                        <span className="text-[9px] font-bold text-zinc-400 light:text-zinc-600 uppercase tracking-tighter">{lead.status}</span>
                                    </div>
                                </div>

                                <ChevronRight className="text-zinc-700 group-hover:text-indigo-400 transition-colors" size={18} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
