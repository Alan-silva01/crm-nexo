import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';

interface ChatListProps {
    onSelectLead: (lead: Lead) => void;
    selectedLeadId?: string;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectLead, selectedLeadId }) => {
    const { effectiveUserId, userType, user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeads = async () => {
        if (!effectiveUserId) return;

        let query = supabase
            .from('leads')
            .select('*')
            .eq('user_id', effectiveUserId)
            .order('updated_at', { ascending: false });

        // Atendentes só veem seus próprios leads
        if (userType === 'atendente' && user?.id) {
            query = query.eq('atendente_id', user.id);
        }

        const { data, error } = await query;

        if (!error && data) {
            setLeads(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLeads();

        // Realtime subscription
        const channel = supabase
            .channel('leads-mobile')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'leads', filter: `user_id=eq.${effectiveUserId}` },
                () => fetchLeads()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [effectiveUserId]);

    const handleRefresh = () => {
        setLoading(true);
        fetchLeads();
    };

    if (loading) {
        return <div className="loading">Carregando...</div>;
    }

    return (
        <div className="chat-list">
            <div className="header">
                <h2>Conversas</h2>
                <button onClick={handleRefresh}>↻ Atualizar</button>
            </div>

            {leads.length === 0 ? (
                <p>Nenhuma conversa encontrada</p>
            ) : (
                <ul>
                    {leads.map((lead) => (
                        <li
                            key={lead.id}
                            onClick={() => onSelectLead(lead)}
                            className={selectedLeadId === lead.id ? 'selected' : ''}
                        >
                            <div className="lead-item">
                                <img src={lead.avatar || '/default-avatar.png'} alt={lead.name} />
                                <div className="lead-info">
                                    <strong>{lead.name}</strong>
                                    <span>{lead.phone}</span>
                                    <p>{lead.last_message || 'Sem mensagens'}</p>
                                </div>
                                <span className="status-badge">{lead.status}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
