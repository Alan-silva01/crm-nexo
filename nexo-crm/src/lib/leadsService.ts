import { supabase } from './supabase';
import { Lead } from '../../types';
import { atendentesService } from './atendentesService';

export const leadsService = {
    async fetchLeads(effectiveUserId?: string): Promise<Lead[]> {
        let targetId = effectiveUserId;

        if (!targetId) {
            const userTypeInfo = await atendentesService.getUserTypeInfo();
            targetId = userTypeInfo?.effectiveUserId;
        }

        if (!targetId) {
            console.error('No effective user ID for fetchLeads');
            return [];
        }

        // Usar targetId para filtrar leads
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', targetId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leads:', error);
            return [];
        }

        return data as Lead[];
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('No authenticated user');
            return null;
        }

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('No authenticated user');
            return { created: [], errorCount: leads.length };
        }

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
