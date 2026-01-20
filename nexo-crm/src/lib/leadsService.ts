import { supabase } from './supabase';
import { Lead } from '../../types';
import { tenantService } from './tenantService';

export const leadsService = {
    /**
     * Busca leads do tenant atual ou de um tenant específico
     * @param tenantId - ID do tenant (opcional, se não informado usa o tenant do usuário logado)
     */
    async fetchLeads(tenantId?: string): Promise<Lead[]> {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`[${requestId}] fetchLeads start. tenantId:`, tenantId);

        let targetTenantId = tenantId;

        // Se não temos tenantId, descobrir do usuário atual
        if (!targetTenantId) {
            console.log(`[${requestId}] No tenantId, discovering from user...`);

            // Aguardar sessão estabilizar
            let sessionRetries = 5;
            let user = null;

            while (!user && sessionRetries > 0) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    user = session.user;
                    break;
                }
                sessionRetries--;
                if (sessionRetries > 0) {
                    console.log(`[${requestId}] Waiting for auth session... (${5 - sessionRetries}/5)`);
                    await new Promise(r => setTimeout(r, 300));
                }
            }

            if (!user) {
                console.error(`[${requestId}] No authenticated user after retries`);
                return [];
            }

            // Descobrir tenant do usuário
            const userInfo = await tenantService.getCurrentUserInfo(user.id);
            targetTenantId = userInfo?.tenantId;

            if (!targetTenantId) {
                console.error(`[${requestId}] Could not determine tenant_id for user`);
                return [];
            }

            console.log(`[${requestId}] Resolved tenant_id:`, targetTenantId);
        }

        // Usar RPC com parâmetro para bypass de RLS issues
        console.log(`[${requestId}] Using fetch_leads_by_admin_id RPC with tenant_id:`, targetTenantId);

        let rpcRetries = 3;
        let delay = 200;

        while (rpcRetries > 0) {
            try {
                // Nota: A RPC ainda usa p_admin_id, que agora é equivalente a tenant_id
                const { data: rpcData, error: rpcError } = await supabase.rpc('fetch_leads_by_admin_id', {
                    p_admin_id: targetTenantId
                });

                if (!rpcError && rpcData && rpcData.length >= 0) {
                    console.log(`[${requestId}] RPC Success! Leads count:`, rpcData.length);
                    return rpcData as Lead[];
                }

                if (rpcError) {
                    console.warn(`[${requestId}] RPC attempt ${4 - rpcRetries}/3 failed:`, rpcError.message);
                }
            } catch (e) {
                console.error(`[${requestId}] RPC exception attempt ${4 - rpcRetries}/3:`, e);
            }

            rpcRetries--;
            if (rpcRetries > 0) {
                await new Promise(r => setTimeout(r, delay));
                delay = Math.min(delay * 1.5, 1500);
            }
        }

        // Fallback: query direta usando tenant_id
        console.log(`[${requestId}] RPC failed, trying direct query with tenant_id...`);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('tenant_id', targetTenantId)
            .order('updated_at', { ascending: false });

        if (!error && data) {
            console.log(`[${requestId}] Direct query success! Leads:`, data.length);
            return data as Lead[];
        }

        // Fallback 2: query com user_id (compatibilidade com dados antigos)
        console.log(`[${requestId}] Tenant query failed, trying user_id fallback...`);
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', targetTenantId)
            .order('updated_at', { ascending: false });

        if (!fallbackError && fallbackData) {
            console.log(`[${requestId}] User_id fallback success! Leads:`, fallbackData.length);
            return fallbackData as Lead[];
        }

        console.error(`[${requestId}] All query methods failed:`, error?.message, fallbackError?.message);
        return [];
    },

    async updateLead(id: string, updates: Partial<Lead>): Promise<boolean> {
        const { error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating lead:', error);
            return false;
        }

        return true;
    },

    async createLead(lead: Omit<Lead, 'id' | 'user_id'>): Promise<Lead | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            console.error('No authenticated user (session)');
            return null;
        }

        // Obter info do tenant do usuário atual
        const userInfo = await tenantService.getCurrentUserInfo(session.user.id);

        if (!userInfo) {
            console.error('Could not get user tenant info');
            return null;
        }

        // Formatar telefone para o padrão WhatsApp
        let formattedPhone = lead.phone;
        if (formattedPhone) {
            if (!formattedPhone.includes('@s.whatsapp.net')) {
                const digits = formattedPhone.replace(/\D/g, '');
                const last10 = digits.slice(-10);
                formattedPhone = `55${last10}@s.whatsapp.net`;
            }
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                ...lead,
                phone: formattedPhone,
                user_id: userInfo.tenantId,  // user_id = tenant_id para compatibilidade
                tenant_id: userInfo.tenantId
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating lead:', error);
            return null;
        }

        return data as Lead;
    },

    async deleteLead(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting lead:', error);
            return false;
        }

        return true;
    },

    async recordHistory(leadId: string, fromColumnId: string | null, toColumnId: string): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const userInfo = await tenantService.getCurrentUserInfo(session.user.id);
        if (!userInfo) return;

        const { error } = await supabase
            .from('lead_column_history')
            .insert([{
                lead_id: leadId,
                from_column_id: fromColumnId,
                to_column_id: toColumnId,
                user_id: userInfo.tenantId
            }]);

        if (error) {
            console.error('Error recording lead history:', error);
        }
    },

    async fetchHistory(leadId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('lead_column_history')
            .select(`
                *,
                lead:leads!lead_id(name),
                from_column:kanban_columns!from_column_id(name),
                to_column:kanban_columns!to_column_id(name)
            `)
            .eq('lead_id', leadId)
            .order('moved_at', { ascending: false });

        if (error) {
            console.error('Error fetching lead history:', error);
            return [];
        }

        return data;
    },

    async fetchAllHistory(tenantId?: string): Promise<any[]> {
        let targetId = tenantId;

        if (!targetId) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return [];

            const userInfo = await tenantService.getCurrentUserInfo(session.user.id);
            targetId = userInfo?.tenantId;
        }

        if (!targetId) return [];

        const { data, error } = await supabase
            .from('lead_column_history')
            .select(`
                *,
                lead:leads!lead_id(name),
                from_column:kanban_columns!from_column_id(name),
                to_column:kanban_columns!to_column_id(name)
            `)
            .eq('user_id', targetId)
            .order('moved_at', { ascending: false });

        if (error) {
            console.error('Error fetching all lead history:', error);
            return [];
        }

        return data;
    },

    /**
     * Cria múltiplos leads em lote (bulk insert)
     */
    async createLeadsBatch(leads: Omit<Lead, 'id' | 'user_id'>[]): Promise<{ created: Lead[]; errorCount: number }> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            console.error('No authenticated user (session)');
            return { created: [], errorCount: leads.length };
        }

        if (!leads || leads.length === 0) {
            return { created: [], errorCount: 0 };
        }

        // Obter info do tenant
        const userInfo = await tenantService.getCurrentUserInfo(session.user.id);

        if (!userInfo) {
            console.error('Could not get user tenant info');
            return { created: [], errorCount: leads.length };
        }

        // Preparar leads com user_id e tenant_id
        const leadsToInsert = leads.map(lead => ({
            ...lead,
            user_id: userInfo.tenantId,  // Para compatibilidade
            tenant_id: userInfo.tenantId
        }));

        console.log('[createLeadsBatch] Inserindo', leadsToInsert.length, 'leads...');

        const { data, error } = await supabase
            .from('leads')
            .insert(leadsToInsert)
            .select();

        if (error) {
            console.error('[createLeadsBatch] ERRO:', error.message, error.details, error.hint);
            return { created: [], errorCount: leads.length };
        }

        console.log('[createLeadsBatch] Sucesso! Criados:', data?.length || 0, 'leads');
        return { created: data as Lead[], errorCount: 0 };
    }
};
