import { supabase } from './supabase';
import { Lead } from '../../types';
import { atendentesService } from './atendentesService';

export const leadsService = {
    async fetchLeads(effectiveUserId?: string): Promise<Lead[]> {
        const requestId = Math.random().toString(36).substring(7);
        console.log(`[${requestId}] fetchLeads start. effectiveUserId:`, effectiveUserId);

        // Se temos effectiveUserId, usar diretamente a RPC com parâmetro (bypass completo de auth.uid)
        if (effectiveUserId) {
            console.log(`[${requestId}] Using fetch_leads_by_admin_id RPC with admin_id:`, effectiveUserId);

            let rpcRetries = 3;
            let delay = 200;

            while (rpcRetries > 0) {
                try {
                    const { data: rpcData, error: rpcError } = await supabase.rpc('fetch_leads_by_admin_id', {
                        p_admin_id: effectiveUserId
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

            // Fallback: query direta se RPC falhar
            console.log(`[${requestId}] RPC failed, trying direct query...`);
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('user_id', effectiveUserId)
                .order('updated_at', { ascending: false });

            if (!error && data) {
                console.log(`[${requestId}] Direct query success! Leads:`, data.length);
                return data as Lead[];
            }

            console.error(`[${requestId}] Direct query also failed:`, error?.message);
            return [];
        }

        // Se NÃO temos effectiveUserId, descobrir primeiro
        console.log(`[${requestId}] No effectiveUserId, discovering user type...`);

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

        // Descobrir tipo de usuário e effectiveUserId
        const userTypeInfo = await atendentesService.getUserTypeInfo(user.id, user.user_metadata);
        const resolvedAdminId = userTypeInfo?.effectiveUserId;

        if (!resolvedAdminId) {
            console.error(`[${requestId}] Could not determine admin_id`);
            return [];
        }

        console.log(`[${requestId}] Resolved admin_id:`, resolvedAdminId, 'Recursing...');

        // Chamar recursivamente com o ID descoberto
        return this.fetchLeads(resolvedAdminId);
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
        // Pegar usuário atual primeiro
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            console.error('No authenticated user (session)');
            return null;
        }
        const user = session.user;

        // Tentar detectar tipo de usuário (com fallback seguro)
        let effectiveUserId = user.id;

        try {
            const userTypeInfo = await atendentesService.getUserTypeInfo();
            if (userTypeInfo) {
                effectiveUserId = userTypeInfo.effectiveUserId;
            }
        } catch (e) {
            console.log('getUserTypeInfo failed, using user.id as fallback');
        }

        // Formatar telefone para o padrão WhatsApp: 55 + últimos 10 dígitos + @s.whatsapp.net
        let formattedPhone = lead.phone;
        if (formattedPhone) {
            // Se já tem @s.whatsapp.net, não formatar
            if (!formattedPhone.includes('@s.whatsapp.net')) {
                // Remover tudo que não for número
                const digits = formattedPhone.replace(/\D/g, '');

                // Pegar apenas os últimos 10 dígitos (DDD + 8 dígitos do número)
                const last10 = digits.slice(-10);

                formattedPhone = `55${last10}@s.whatsapp.net`;
            }
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([{ ...lead, phone: formattedPhone, user_id: effectiveUserId }])
            .select()
            .single();

        if (error) {
            console.error('Error creating lead:', error);
            return null;
        }

        // The provided snippet for sorting is syntactically incorrect for a single object returned by .single().
        // If the intention was to sort a list of leads, it would apply to a different function or context.
        // As per instructions to make the file syntactically correct, this specific snippet cannot be applied here.
        // If the goal is to ensure the returned lead has an updated_at, that's handled by the database trigger.

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
        const user = session.user;

        const { error } = await supabase
            .from('lead_column_history')
            .insert([{
                lead_id: leadId,
                from_column_id: fromColumnId,
                to_column_id: toColumnId,
                user_id: user.id
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

    async fetchAllHistory(effectiveUserId?: string): Promise<any[]> {
        let targetId = effectiveUserId;

        if (!targetId) {
            const { data: { session } } = await supabase.auth.getSession();
            targetId = session?.user?.id;
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
     * Cria múltiplos leads em lote (bulk insert).
     * @param leads - Lista de leads a serem criados (sem id e user_id).
     * @returns Objeto com leads criados e contagem de erros.
     */
    async createLeadsBatch(leads: Omit<Lead, 'id' | 'user_id'>[]): Promise<{ created: Lead[]; errorCount: number }> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            console.error('No authenticated user (session)');
            return { created: [], errorCount: leads.length };
        }
        const user = session.user;

        if (!leads || leads.length === 0) {
            return { created: [], errorCount: 0 };
        }

        // Preparar leads com user_id (o telefone já deve vir formatado do parser)
        const leadsToInsert = leads.map(lead => ({
            ...lead,
            user_id: user.id
        }));

        console.log('[createLeadsBatch] Inserindo', leadsToInsert.length, 'leads...');
        console.log('[createLeadsBatch] Primeiro lead:', JSON.stringify(leadsToInsert[0], null, 2));

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
