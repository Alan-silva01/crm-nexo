import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead, Message, KanbanColumn } from '../lib/supabase';
import { useAuth } from '../lib/AuthProvider';

interface ChatViewProps {
    lead: Lead;
    onBack: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ lead, onBack }) => {
    const { effectiveUserId, user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [columns, setColumns] = useState<KanbanColumn[]>([]);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Determinar nome da tabela de chat baseado no perfil
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

        const { data } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('id', effectiveUserId)
            .single();

        if (data?.company_name) {
            // Normalizar nome: lowercase, sem espaços, sem acentos
            const tableName = data.company_name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
            setChatTableName(`chat_${tableName}`);
        }
    };

    const fetchColumns = async () => {
        if (!effectiveUserId) return;

        const { data } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('user_id', effectiveUserId)
            .order('position');

        if (data) setColumns(data);
    };

    const fetchMessages = async () => {
        if (!chatTableName || !lead.phone) return;

        // Usar customer_id do lead ou o phone
        const customerId = (lead as any).customer_id || lead.phone;

        const { data } = await supabase
            .from(chatTableName)
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: true });

        if (data) {
            const formatted = data.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender as 'user' | 'client',
                timestamp: msg.created_at,
            }));
            setMessages(formatted);
        }
    };

    const subscribeToMessages = () => {
        if (!chatTableName) return;

        const channel = supabase
            .channel(`chat-${lead.id}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: chatTableName },
                (payload) => {
                    const msg = payload.new as any;
                    setMessages(prev => [...prev, {
                        id: msg.id,
                        content: msg.content,
                        sender: msg.sender,
                        timestamp: msg.created_at,
                    }]);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || sending) return;

        setSending(true);

        // Buscar webhook URL do perfil
        const { data: profile } = await supabase
            .from('profiles')
            .select('webhook_url')
            .eq('id', effectiveUserId)
            .single();

        if (profile?.webhook_url) {
            try {
                await fetch(profile.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: lead.phone,
                        message: newMessage,
                        lead_id: lead.id,
                        sender: 'user',
                    }),
                });
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }

        // Salvar no banco local também
        if (chatTableName) {
            const customerId = (lead as any).customer_id || lead.phone;
            await supabase.from(chatTableName).insert({
                customer_id: customerId,
                content: newMessage,
                sender: 'user',
            });
        }

        setNewMessage('');
        setSending(false);
    };

    const changeStatus = async (newStatus: string) => {
        await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', lead.id);

        lead.status = newStatus;
        setShowStatusModal(false);
    };

    return (
        <div className="chat-view">
            {/* Header */}
            <div className="chat-header">
                <button onClick={onBack}>← Voltar</button>
                <div className="lead-header-info">
                    <strong>{lead.name}</strong>
                    <span>{lead.phone}</span>
                </div>
                <button onClick={() => setShowStatusModal(true)}>
                    {lead.status} ▼
                </button>
            </div>

            {/* Messages */}
            <div className="messages-container">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.sender}`}>
                        <p>{msg.content}</p>
                        <span className="timestamp">
                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="message-input">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} disabled={sending}>
                    {sending ? '...' : 'Enviar'}
                </button>
            </div>

            {/* Status Modal */}
            {showStatusModal && (
                <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Mover para:</h3>
                        <ul>
                            {columns.map((col) => (
                                <li
                                    key={col.id}
                                    onClick={() => changeStatus(col.name)}
                                    className={lead.status === col.name ? 'selected' : ''}
                                >
                                    {col.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
