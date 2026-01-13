import { supabase } from './supabase';
import { SDRMessage } from '../../types';

// Extrai apenas números do telefone para comparação
function extractNumbers(phone: string | null): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

export const chatsSdrService = {
    async fetchChatsByPhone(phone: string, limit: number = 50, offset: number = 0): Promise<{ messages: SDRMessage[], hasMore: boolean }> {
        if (!phone) return { messages: [], hasMore: false };

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No authenticated user');
            return { messages: [], hasMore: false };
        }

        // 1. Buscar nome da tabela de chats do usuário
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('chat_table_name')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.chat_table_name) {
            console.error('Chat table not found for user:', profileError);
            return { messages: [], hasMore: false };
        }

        const phoneNumbers = extractNumbers(phone);
        console.log('Fetching chats from table:', profile.chat_table_name, 'for phone:', phone, 'limit:', limit, 'offset:', offset);

        // 2. Buscar chats da tabela específica do usuário com paginação
        // Ordenamos por ID descendente para pegar os mais recentes primeiro
        let { data, error, count } = await supabase
            .from(profile.chat_table_name)
            .select('*', { count: 'exact' })
            .eq('session_id', phone)
            .order('id', { ascending: false })
            .range(offset, offset + limit - 1);

        // Se não encontrar, tenta por números
        if ((!data || data.length === 0) && phoneNumbers) {
            const result = await supabase
                .from(profile.chat_table_name)
                .select('*', { count: 'exact' })
                .like('session_id', `${phoneNumbers}%`)
                .order('id', { ascending: false })
                .range(offset, offset + limit - 1);
            data = result.data;
            error = result.error;
            count = result.count;
        }

        console.log('Chats found:', data?.length || 0, 'Total count:', count, error ? `Error: ${error.message}` : '');

        if (error) {
            console.error('Error fetching chats:', error);
            return { messages: [], hasMore: false };
        }

        // Inverter para ordem cronológica (mais antigo primeiro) para exibição
        const messages = ((data || []) as SDRMessage[]).reverse();
        const hasMore = count !== null && (offset + limit) < count;

        return { messages, hasMore };
    },

    async sendMessage(phone: string, content: string, agentName: string): Promise<SDRMessage | null> {
        if (!phone) return null;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No authenticated user');
            return null;
        }

        // Buscar tabela de chats E webhook do usuário
        const { data: profile } = await supabase
            .from('profiles')
            .select('chat_table_name, webhook_url')
            .eq('id', user.id)
            .single();

        if (!profile?.chat_table_name) {
            console.error('Chat table not configured for user');
            return null;
        }

        // Se não tiver webhook configurado, não envia para o n8n
        const userWebhookUrl = profile.webhook_url;

        const phoneNumbers = extractNumbers(phone);
        const cleanPhone = extractNumbers(phone);
        let finalSessionId = phone;

        // Buscar session_id correto no banco usando número limpo
        const { data: existingChats } = await supabase
            .from(profile.chat_table_name)
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

        // Enviar para o Webhook do usuário (se configurado)
        if (userWebhookUrl) {
            try {
                console.log('Sending to User Webhook via Proxy for:', finalSessionId, 'URL:', userWebhookUrl);

                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        targetUrl: userWebhookUrl,
                        data: {
                            evento: 'mensagem',
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
        } else {
            console.log('No webhook configured for this user, skipping external notification');
        }

        // Salvar no banco (na tabela específica do usuário)
        const messagePayload = {
            type: 'ai' as const,
            content,
            tool_calls: [],
            invalid_tool_calls: [],
            additional_kwargs: {},
            response_metadata: {}
        };

        const { data, error } = await supabase
            .from(profile.chat_table_name)
            .insert([{
                session_id: finalSessionId,
                message: messagePayload,
                atendente: agentName // Identifica que foi enviado por um humano
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No authenticated user');
            return;
        }

        // Buscar tabela de chats E webhook do usuário
        const { data: profile } = await supabase
            .from('profiles')
            .select('chat_table_name, webhook_url')
            .eq('id', user.id)
            .single();

        const userWebhookUrl = profile?.webhook_url;
        const chatTableName = profile?.chat_table_name || 'chats_sdr';

        const cleanPhone = extractNumbers(phone);
        let sessionId = phone;

        // Buscar session_id correto no banco usando número limpo
        const { data: existingChats } = await supabase
            .from(chatTableName)
            .select('session_id')
            .or(`session_id.eq.${phone},session_id.ilike.%${cleanPhone}%`)
            .limit(1);

        if (existingChats && existingChats.length > 0) {
            sessionId = existingChats[0].session_id;
        } else if (cleanPhone && !sessionId.includes('@s.whatsapp.net')) {
            sessionId = `${cleanPhone}@s.whatsapp.net`;
        }

        // Preparar dados
        const isPaused = action === 'pausar';
        const evento = action === 'pausar' ? 'pausar_ia' : 'ativar_ia';

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

        // Enviar para o Webhook do usuário (se configurado)
        if (userWebhookUrl) {
            const proxyUrl = 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/crm_api/proxy-webhook';

            try {
                console.log(`Sending ${evento} to User Webhook via Proxy for:`, sessionId, 'URL:', userWebhookUrl);

                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        targetUrl: userWebhookUrl,
                        data: {
                            evento: evento,
                            phone: sessionId,
                            action: action === 'pausar' ? 'Pausar IA' : 'Ativar IA'
                        }
                    })
                });
                const result = await response.json();
                console.log('Webhook proxy response (Toggle AI):', result);
            } catch (error) {
                console.error(`Error toggling AI (${action}) via proxy:`, error);
            }
        } else {
            console.log('No webhook configured for this user, skipping AI toggle notification');
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
