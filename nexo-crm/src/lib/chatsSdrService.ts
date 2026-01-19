import { supabase } from './supabase';
import { SDRMessage } from '../../types';

// Extrai apenas números do telefone para comparação
function extractNumbers(phone: string | null): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

/**
 * Busca o chat_table_name e webhook_url do perfil correto:
 * - Se for atendente: busca do perfil do admin
 * - Se for admin: busca do próprio perfil
 * Uses SECURITY DEFINER function to bypass RLS issues
 * Implements robust retry with exponential backoff for post-refresh stability
 */
async function getEffectiveProfileData(): Promise<{ chat_table_name: string | null; webhook_url: string | null } | null> {
    // Aguardar sessão estar disponível com retry
    let user = null;
    let sessionRetries = 5;

    while (!user && sessionRetries > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            user = session.user;
            break;
        }
        sessionRetries--;
        if (sessionRetries > 0) {
            console.log(`[getEffectiveProfileData] Waiting for auth session... (${5 - sessionRetries}/5)`);
            await new Promise(r => setTimeout(r, 300));
        }
    }

    if (!user) {
        console.error('[getEffectiveProfileData] No authenticated user after retries');
        return null;
    }

    // Retry robusto para a função RPC com backoff exponencial
    let retries = 5;
    let delay = 200; // Start with 200ms

    while (retries > 0) {
        try {
            const { data, error } = await supabase.rpc('get_effective_profile');

            if (!error && data && data.length > 0) {
                console.log('[getEffectiveProfileData] Success! Table:', data[0].chat_table_name);
                return {
                    chat_table_name: data[0].chat_table_name,
                    webhook_url: data[0].webhook_url
                };
            }

            if (error) {
                console.warn(`[getEffectiveProfileData] RPC attempt ${6 - retries}/5 failed:`, error.message);
            } else {
                console.warn(`[getEffectiveProfileData] RPC returned empty data, attempt ${6 - retries}/5`);
            }
        } catch (e) {
            console.error(`[getEffectiveProfileData] Exception on attempt ${6 - retries}/5:`, e);
        }

        retries--;
        if (retries > 0) {
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * 1.5, 2000); // Exponential backoff, max 2s
        }
    }

    // Fallback: Direct query se todos os retries falharam
    console.warn('[getEffectiveProfileData] All RPC retries failed, trying direct query...');

    try {
        const { data: atendente } = await supabase
            .from('atendentes')
            .select('admin_id')
            .eq('user_id', user.id)
            .eq('ativo', true)
            .maybeSingle();

        const profileUserId = atendente?.admin_id || user.id;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('chat_table_name, webhook_url')
            .eq('id', profileUserId)
            .single();

        if (!profileError && profile) {
            console.log('[getEffectiveProfileData] Fallback query succeeded! Table:', profile.chat_table_name);
            return profile;
        }

        console.error('[getEffectiveProfileData] Fallback query failed:', profileError?.message);
    } catch (e) {
        console.error('[getEffectiveProfileData] Fallback query exception:', e);
    }

    return null;
}

export const chatsSdrService = {
    async fetchChatsByPhone(phone: string, limit: number = 50, offset: number = 0, chatTableName?: string): Promise<{ messages: SDRMessage[], hasMore: boolean }> {
        if (!phone) return { messages: [], hasMore: false };

        // Usar chatTableName passado ou buscar via getEffectiveProfileData
        let tableName = chatTableName;

        if (!tableName) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                console.error('No authenticated user (session)');
                return { messages: [], hasMore: false };
            }

            // Buscar nome da tabela de chats (do admin, se for atendente)
            const profile = await getEffectiveProfileData();
            tableName = profile?.chat_table_name;
        }

        if (!tableName) {
            console.error('Chat table not found for user');
            return { messages: [], hasMore: false };
        }

        const phoneNumbers = extractNumbers(phone);
        console.log('[chatsSdrService] Fetching chats from table:', tableName, 'for phone:', phone, 'limit:', limit, 'offset:', offset);

        // 2. Buscar chats da tabela específica do usuário com paginação
        // Ordenamos por ID descendente para pegar os mais recentes primeiro
        let { data, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .eq('session_id', phone)
            .order('id', { ascending: false })
            .range(offset, offset + limit - 1);

        console.log('[chatsSdrService] Query 1 (exact match) result:', { found: data?.length || 0, error: error?.message });

        // Se não encontrar, tenta por números
        if ((!data || data.length === 0) && phoneNumbers) {
            console.log('[chatsSdrService] Trying query 2 (like match) with:', phoneNumbers);
            const result = await supabase
                .from(tableName)
                .select('*', { count: 'exact' })
                .like('session_id', `${phoneNumbers}%`)
                .order('id', { ascending: false })
                .range(offset, offset + limit - 1);
            data = result.data;
            error = result.error;
            count = result.count;
            console.log('[chatsSdrService] Query 2 result:', { found: data?.length || 0, error: error?.message });
        }

        console.log('[chatsSdrService] Final - Chats found:', data?.length || 0, 'Total count:', count, error ? `Error: ${error.message}` : '');

        if (error) {
            console.error('[chatsSdrService] Error fetching chats:', error);
            return { messages: [], hasMore: false };
        }

        // Inverter para ordem cronológica (mais antigo primeiro) para exibição
        const messages = ((data || []) as SDRMessage[]).reverse();
        const hasMore = count !== null && (offset + limit) < count;

        return { messages, hasMore };
    },

    async sendMessage(phone: string, content: string, agentName: string): Promise<SDRMessage | null> {
        if (!phone) return null;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            console.error('No authenticated user (session)');
            return null;
        }

        // Buscar tabela de chats E webhook (do admin, se for atendente)
        const profile = await getEffectiveProfileData();

        if (!profile?.chat_table_name) {
            console.error('Chat table not configured');
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

                // Get session for auth token
                const { data: { session } } = await supabase.auth.getSession();
                const authToken = session?.access_token;

                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            console.error('No authenticated user (session)');
            return;
        }

        // Buscar tabela de chats E webhook (do admin, se for atendente)
        const profile = await getEffectiveProfileData();

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

        console.log(`🔄 toggleAI called: action=${action}, phone=${phone}, isPaused=${isPaused}`);

        // Atualizar no banco de dados (tabela leads) para persistência real
        // Usar phone normalizado para buscar o lead e atualizar
        try {
            // Primeiro buscar o ID do lead pelo phone
            console.log(`🔍 Searching for lead with phone: ${phone} or cleanPhone: ${cleanPhone}`);

            const { data: leadData, error: findError } = await supabase
                .from('leads')
                .select('id, name, ai_paused')
                .or(`phone.eq.${phone},phone.ilike.%${cleanPhone}%`)
                .limit(1)
                .single();

            console.log('📊 Lead search result:', { leadData, findError });

            if (findError || !leadData) {
                console.error('❌ Could not find lead to update AI status:', findError);
                throw new Error(`Lead not found for phone ${phone}`);
            }

            console.log(`✅ Found lead: ${leadData.name} (ID: ${leadData.id}), current ai_paused: ${leadData.ai_paused}`);

            // Agora atualizar pelo ID específico (o RLS permite pelo user_id implícito)
            console.log(`💾 Updating lead ${leadData.id} with ai_paused=${isPaused}`);

            const { data: updateData, error: updateError } = await supabase
                .from('leads')
                .update({ ai_paused: isPaused, updated_at: new Date().toISOString() })
                .eq('id', leadData.id)
                .select();

            console.log('📝 Update result:', { updateData, updateError });

            if (updateError) {
                console.error('❌ Error updating AI status in leads table:', updateError);
                throw updateError;
            } else {
                console.log(`✅✅✅ AI status successfully persisted as ${action} for lead ${leadData.name} (id: ${leadData.id})`);
            }
        } catch (e) {
            console.error('💥 Failed to update leads table:', e);
            throw e; // Re-throw para não continuar silenciosamente
        }

        // Enviar para o Webhook do usuário (se configurado)
        if (userWebhookUrl) {
            const proxyUrl = 'https://jreklrhamersmamdmjna.supabase.co/functions/v1/crm_api/proxy-webhook';

            try {
                console.log(`Sending ${evento} to User Webhook via Proxy for:`, sessionId, 'URL:', userWebhookUrl);

                // Get session for auth token
                const { data: { session } } = await supabase.auth.getSession();
                const authToken = session?.access_token;

                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
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
