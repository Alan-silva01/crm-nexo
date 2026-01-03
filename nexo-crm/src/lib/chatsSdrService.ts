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
        // Tenta obter o session_id mais correto possível do banco
        // Se não achar, usa o phone formatado como fallback tentativo (mas o ideal é o do banco)
        let finalSessionId = sessionId;

        // Formatar para session id do whatsapp se não parecer um
        if (!finalSessionId.includes('@s.whatsapp.net')) {
            // Tenta formatar: 55 + DDD + Numero + @s.whatsapp.net
            // Mas só se tivermos certeza do numero. Por enquanto mantemos o sessionId encontrado ou o phone input.
            // Idealmente o banco SEMPRE tem o session_id correto.
        }

        // Webhook Proxy URL (Edge Function)
        const proxyUrl = 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/crm_api/proxy-webhook';

        // Enviar para o Webhook (Intervenção Humana) via Proxy
        try {
            console.log('Sending to Webhook (Message) via Proxy');

            await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUrl: 'https://autonomia-n8n-webhook.w8liji.easypanel.host/webhook/intervencaohumana',
                    data: {
                        phone: finalSessionId,
                        message: content,
                        agent_name: agentName
                    }
                })
            });
            console.log('Webhook proxy call completed');

        } catch (error) {
            console.error('Error sending to webhook via proxy:', error);
        }

        // Salvar no banco
        const messagePayload = {
            type: 'ai' as const,
            content,
            agent_name: agentName,
            additional_kwargs: {},
            response_metadata: {}
        };

        const { data, error } = await supabase
            .from('chats_sdr')
            .insert([{
                session_id: finalSessionId,
                message: messagePayload
            }])
            .select()
            .single();

        if (error) {
            console.error('Error sending message to DB:', error);
            return null;
        }

        return data as SDRMessage;
    },

    async toggleAI(phone: string, action: 'pausar' | 'ativar'): Promise<void> {
        if (!phone) return;

        const phoneNumbers = extractNumbers(phone);
        let sessionId = phone;

        // Buscar session_id correto no banco
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

        // Preparar dados
        const actionText = action === 'pausar' ? 'Pausar IA' : 'Ativar IA';

        // Webhook Proxy URL
        const proxyUrl = 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/crm_api/proxy-webhook';

        try {
            console.log('Sending to Webhook (Toggle AI) via Proxy');

            await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUrl: 'https://autonomia-n8n-webhook.w8liji.easypanel.host/webhook/pausa-ia',
                    data: {
                        phone: sessionId,
                        action: actionText
                    }
                })
            });
            console.log(`AI toggle webhook sent via proxy for ${sessionId}`);
        } catch (error) {
            console.error(`Error toggling AI (${action}) via proxy:`, error);
        }
    }
};
