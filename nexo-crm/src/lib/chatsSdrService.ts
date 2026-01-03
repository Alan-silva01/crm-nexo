import { supabase } from './supabase';
import { SDRMessage } from '../../types';

// Normaliza o telefone para o formato do session_id (apenas números)
function normalizePhone(phone: string | null): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

export const chatsSdrService = {
    async fetchChatsByPhone(phone: string): Promise<SDRMessage[]> {
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) return [];

        // Buscar por session_id que contenha o telefone
        const { data, error } = await supabase
            .from('chats_sdr')
            .select('*')
            .like('session_id', `%${normalizedPhone}%`)
            .order('id', { ascending: true });

        if (error) {
            console.error('Error fetching SDR chats:', error);
            return [];
        }

        return (data || []) as SDRMessage[];
    },

    async sendMessage(phone: string, content: string, agentName: string): Promise<SDRMessage | null> {
        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) return null;

        // Buscar session_id existente para este telefone
        const { data: existingChats } = await supabase
            .from('chats_sdr')
            .select('session_id')
            .like('session_id', `%${normalizedPhone}%`)
            .limit(1);

        const sessionId = existingChats?.[0]?.session_id || normalizedPhone;

        const messagePayload = {
            type: 'agent' as const,
            content,
            agent_name: agentName,
            additional_kwargs: {},
            response_metadata: {}
        };

        const { data, error } = await supabase
            .from('chats_sdr')
            .insert([{
                session_id: sessionId,
                message: messagePayload
            }])
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            return null;
        }

        return data as SDRMessage;
    }
};
