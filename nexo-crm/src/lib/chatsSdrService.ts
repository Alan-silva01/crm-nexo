import { supabase } from './supabase';
import { SDRMessage } from '../../types';

// Extrai apenas números do telefone para comparação
function extractNumbers(phone: string | null): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

export const chatsSdrService = {
    async fetchChatsByPhone(phone: string): Promise<SDRMessage[]> {
        if (!phone) return [];

        const phoneNumbers = extractNumbers(phone);
        console.log('Fetching chats for phone:', phone, '-> numbers:', phoneNumbers);

        // Primeiro tenta buscar por match exato do session_id
        let { data, error } = await supabase
            .from('chats_sdr')
            .select('*')
            .eq('session_id', phone)
            .order('id', { ascending: true });

        // Se não encontrar, tenta buscar por session_id que começa com os números
        if ((!data || data.length === 0) && phoneNumbers) {
            const result = await supabase
                .from('chats_sdr')
                .select('*')
                .like('session_id', `${phoneNumbers}%`)
                .order('id', { ascending: true });
            data = result.data;
            error = result.error;
        }

        console.log('Chats found:', data?.length || 0, error ? `Error: ${error.message}` : '');

        if (error) {
            console.error('Error fetching SDR chats:', error);
            return [];
        }

        return (data || []) as SDRMessage[];
    },

    async sendMessage(phone: string, content: string, agentName: string): Promise<SDRMessage | null> {
        if (!phone) return null;

        const phoneNumbers = extractNumbers(phone);

        // Buscar session_id existente para este telefone
        let sessionId = phone;

        const { data: existingChats } = await supabase
            .from('chats_sdr')
            .select('session_id')
            .eq('session_id', phone)
            .limit(1);

        if (!existingChats || existingChats.length === 0) {
            const { data: byNumbers } = await supabase
                .from('chats_sdr')
                .select('session_id')
                .like('session_id', `${phoneNumbers}%`)
                .limit(1);

            if (byNumbers && byNumbers.length > 0) {
                sessionId = byNumbers[0].session_id;
            }
        } else {
            sessionId = existingChats[0].session_id;
        }

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
