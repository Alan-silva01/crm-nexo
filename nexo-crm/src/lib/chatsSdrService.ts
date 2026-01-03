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

        // Limpar o telefone para busca no banco
        const cleanPhone = extractNumbers(phone);
        let finalSessionId = phone;

        // Buscar session_id correto no banco usando número limpo
        const { data: existingChats } = await supabase
            .from('chats_sdr')
            .select('session_id')
            .or(`session_id.eq.${phone},session_id.ilike.%${cleanPhone}%`)
            .limit(1);

        if (existingChats && existingChats.length > 0) {
            finalSessionId = existingChats[0].session_id;
        } else if (cleanPhone && !finalSessionId.includes('@s.whatsapp.net')) {
            finalSessionId = `${cleanPhone}@s.whatsapp.net`;
        }

        // Webhook Proxy URL (Edge Function)
        const proxyUrl = 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/crm_api/proxy-webhook';

        // Enviar para o Webhook (Intervenção Humana) via Proxy
        try {
            console.log('Sending to Webhook (Message) via Proxy for:', finalSessionId);

            const response = await fetch(proxyUrl, {
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
            const result = await response.json();
            console.log('Webhook proxy response (Message):', result);

        } catch (error) {
            console.error('Error sending to webhook via proxy:', error);
        }

        // Salvar no banco (Exatamente no formato solicitado pela IA para manter compatibilidade)
        const messagePayload = {
            type: 'ai' as const,
            content,
            tool_calls: [],
            invalid_tool_calls: [],
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

        const cleanPhone = extractNumbers(phone);
        let sessionId = phone;

        // Buscar session_id correto no banco usando número limpo
        const { data: existingChats } = await supabase
            .from('chats_sdr')
            .select('session_id')
            .or(`session_id.eq.${phone},session_id.ilike.%${cleanPhone}%`)
            .limit(1);

        if (existingChats && existingChats.length > 0) {
            sessionId = existingChats[0].session_id;
        } else if (cleanPhone && !sessionId.includes('@s.whatsapp.net')) {
            sessionId = `${cleanPhone}@s.whatsapp.net`;
        }

        // Preparar dados
        const actionText = action === 'pausar' ? 'Pausar IA' : 'Ativar IA';
        const isPaused = action === 'pausar';

        // Atualizar no banco de dados (tabela leads) para persistência real
        try {
            const { error: updateError } = await supabase
                .from('leads')
                .update({ ai_paused: isPaused })
                .or(`phone.eq.${phone},phone.ilike.%${cleanPhone}%`);

            if (updateError) {
                console.error('Error updating AI status in leads table:', updateError);
            } else {
                console.log(`AI status persisted as ${action} for lead ${cleanPhone}`);
            }
        } catch (e) {
            console.error('Failed to update leads table:', e);
        }

        // Webhook Proxy URL
        const proxyUrl = 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/crm_api/proxy-webhook';

        try {
            console.log('Sending to Webhook (Toggle AI) via Proxy for:', sessionId);

            const response = await fetch(proxyUrl, {
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
            const result = await response.json();
            console.log('Webhook proxy response (Toggle):', result);
        } catch (error) {
            console.error(`Error toggling AI (${action}) via proxy:`, error);
        }
    },

    async getAIStatus(phone: string): Promise<boolean> {
        if (!phone) return false;
        const cleanPhone = extractNumbers(phone);

        try {
            const { data, error } = await supabase
                .from('leads')
                .select('ai_paused')
                .or(`phone.eq.${phone},phone.ilike.%${cleanPhone}%`)
                .maybeSingle();

            if (error) {
                console.error('Error fetching AI status:', error);
                return false;
            }

            return data?.ai_paused || false;
        } catch (e) {
            console.error('Exception fetching AI status:', e);
            return false;
        }
    }
};
