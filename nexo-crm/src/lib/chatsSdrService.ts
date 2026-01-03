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

        // Enviar para o Webhook (Intervenção Humana)
        try {
            // Usando no-cors e URLSearchParams para tentar evitar bloqueio CORS do navegador
            // O n8n deve estar preparado para receber dados via Query Params ou Form Data
            const params = new URLSearchParams({
                phone: sessionId,
                message: content,
                agent_name: agentName
            });

            // Tenta enviar POST form-encoded
            await fetch('https://autonomia-n8n-webhook.w8liji.easypanel.host/webhook/intervencaohumana', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

        } catch (error) {
            console.error('Error sending to webhook:', error);
            // Continua mesmo com erro no webhook para salvar no banco?
            // O usuário pediu "e enviar", mas vamos garantir que salve pelo menos.
        }

        // Salvar no banco como requested: "como se fosse a ia falando"
        // Vamos usar type: 'ai' mas mantendo agent_name para o frontend identificar
        const messagePayload = {
            type: 'ai' as const, // Solicitado: salvar como IA
            content,
            agent_name: agentName, // Mantemos para o frontend saber que foi agente
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
    },

    async toggleAI(phone: string, action: 'pausar' | 'ativar'): Promise<void> {
        if (!phone) return;

        const phoneNumbers = extractNumbers(phone);
        let sessionId = phone;

        // Buscar session_id existente (lógica simplificada, assume que sendMessage já resolveu ou usa o phone direto)
        // Tentamos buscar exato primeiro
        const { data: existingChats } = await supabase
            .from('chats_sdr')
            .select('session_id')
            .eq('session_id', phone)
            .limit(1);

        if (existingChats && existingChats.length > 0) {
            sessionId = existingChats[0].session_id;
        } else if (phoneNumbers) {
            const { data: byNumbers } = await supabase
                .from('chats_sdr')
                .select('session_id')
                .like('session_id', `${phoneNumbers}%`)
                .limit(1);
            if (byNumbers && byNumbers.length > 0) {
                sessionId = byNumbers[0].session_id;
            }
        }

        try {
            const params = new URLSearchParams({
                phone: sessionId,
                action
            });

            await fetch('https://autonomia-n8n-webhook.w8liji.easypanel.host/webhook/pausa-ia', {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });
            console.log(`AI ${action} sent for ${sessionId}`);
        } catch (error) {
            console.error(`Error toggling AI (${action}):`, error);
        }
    }
};
