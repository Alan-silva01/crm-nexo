import { supabase } from './supabase';

export interface Atendente {
    id: string;
    admin_id: string;
    user_id: string;
    nome: string;
    email: string;
    ativo: boolean;
    created_at: string;
}

export interface UserTypeInfo {
    type: 'admin' | 'atendente';
    effectiveUserId: string; // ID do admin (para buscar dados)
    atendenteInfo?: Atendente; // Info do atendente se for atendente
}

export const atendentesService = {
    /**
     * Detecta se o usuário é admin ou atendente.
     * @param userId - ID do usuário
     */
    async getUserTypeInfo(userId?: string, userMetadata?: any): Promise<UserTypeInfo | null> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            console.log(`[${requestId}] getUserTypeInfo start for:`, userId);

            if (!userId) {
                console.error(`[${requestId}] No userId provided to getUserTypeInfo`);
                return null;
            }

            // Se tem metadata de atendente com admin_id, busca dados completos do DB
            if (userMetadata?.is_atendente === true && userMetadata?.admin_id) {
                console.log(`[${requestId}] Metadata indicates atendente, fetching full record from DB...`);
                // Mesmo com metadata, precisamos buscar o record completo para ter o ID
                const { data: atendenteFromDb } = await supabase
                    .from('atendentes')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('ativo', true)
                    .maybeSingle();

                if (atendenteFromDb) {
                    console.log(`[${requestId}] Found atendente in DB:`, atendenteFromDb.id);
                    return {
                        type: 'atendente' as const,
                        effectiveUserId: atendenteFromDb.admin_id as string,
                        atendenteInfo: atendenteFromDb as Atendente
                    };
                }
                // Fallback: usar metadata se DB falhar
                console.log(`[${requestId}] DB query failed, using metadata only (no atendenteInfo.id)`);
            }

            // Query única, sem retry, com timeout de 3 segundos
            console.log(`[${requestId}] DB Query: Checking atendentes table for ${userId}...`);

            const queryPromise = supabase
                .from('atendentes')
                .select('*')
                .eq('user_id', userId)
                .eq('ativo', true)
                .maybeSingle();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Query timeout')), 3000)
            );

            let atendente = null;
            try {
                const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
                if (!error && data) {
                    atendente = data;
                }
                console.log(`[${requestId}] DB Query result:`, { found: !!atendente, error: error?.message });
            } catch (e: any) {
                console.warn(`[${requestId}] Query failed or timed out:`, e.message);
                // Continua mesmo se a query falhar - vai retornar admin
            }

            if (atendente) {
                console.log(`[${requestId}] Returning type: atendente, effectiveId:`, atendente.admin_id);
                return {
                    type: 'atendente' as const,
                    effectiveUserId: atendente.admin_id as string,
                    atendenteInfo: atendente as Atendente
                };
            }

            // Não é atendente ativo = é admin
            console.log(`[${requestId}] Returning type: admin, effectiveId:`, userId);
            return {
                type: 'admin' as const,
                effectiveUserId: userId
            };
        } catch (e) {
            console.error(`[${requestId}] Error in getUserTypeInfo, defaulting to admin:`, e);
            // NUNCA lança erro - retorna admin como fallback
            return {
                type: 'admin' as const,
                effectiveUserId: userId || ''
            };
        }
    },

    async listAtendentes(adminId?: string): Promise<Atendente[]> {
        let targetAdminId = adminId;

        if (!targetAdminId) {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return [];

            // Verificar se é atendente para pegar o admin_id correto
            const { data: atendente } = await supabase
                .from('atendentes')
                .select('admin_id')
                .eq('user_id', session.user.id)
                .eq('ativo', true)
                .maybeSingle();

            targetAdminId = atendente?.admin_id || session.user.id;
        }

        const { data, error } = await supabase
            .from('atendentes')
            .select('*')
            .eq('admin_id', targetAdminId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error listing atendentes:', error);
            return [];
        }

        return data as Atendente[];
    },

    /**
     * Busca o limite de atendentes do admin
     */
    async getMaxAtendentes(): Promise<number> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;

        const { data: profile } = await supabase
            .from('profiles')
            .select('max_atendentes')
            .eq('id', user.id)
            .single();

        return profile?.max_atendentes || 0;
    },

    /**
     * Cria um novo atendente via Edge Function
     */
    async createAtendente(nome: string, email: string, senha: string): Promise<{ success: boolean; error?: string }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Não autenticado' };

        try {
            // Chamar Edge Function que usa Service Role Key
            const { data, error } = await supabase.functions.invoke('create-atendente', {
                body: {
                    nome,
                    email,
                    senha,
                    admin_id: user.id
                }
            });

            if (error) {
                console.error('Error calling create-atendente function:', error);
                return { success: false, error: error.message };
            }

            if (data?.error) {
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (e: any) {
            console.error('Error creating atendente:', e);
            return { success: false, error: e.message || 'Erro desconhecido' };
        }
    },

    /**
     * Ativa ou desativa um atendente
     */
    async toggleAtendente(atendenteId: string, ativo: boolean): Promise<boolean> {
        const { error } = await supabase
            .from('atendentes')
            .update({ ativo })
            .eq('id', atendenteId);

        if (error) {
            console.error('Error toggling atendente:', error);
            return false;
        }

        return true;
    },

    /**
     * Deleta um atendente (e o usuário do Auth)
     */
    async deleteAtendente(atendenteId: string): Promise<boolean> {
        // Buscar user_id do atendente
        const { data: atendente } = await supabase
            .from('atendentes')
            .select('user_id')
            .eq('id', atendenteId)
            .single();

        if (!atendente) return false;

        // Deletar do Auth
        const { error: authError } = await supabase.auth.admin.deleteUser(atendente.user_id);
        if (authError) {
            console.error('Error deleting auth user:', authError);
        }

        // Deletar da tabela (cascade já deve cuidar, mas garantir)
        const { error } = await supabase
            .from('atendentes')
            .delete()
            .eq('id', atendenteId);

        if (error) {
            console.error('Error deleting atendente:', error);
            return false;
        }

        return true;
    },

    /**
     * Atribui um lead a um atendente
     */
    async assignLeadToAtendente(leadId: string, atendenteId: string | null): Promise<boolean> {
        const { error } = await supabase
            .from('leads')
            .update({ assigned_to: atendenteId })
            .eq('id', leadId);

        if (error) {
            console.error('Error assigning lead:', error);
            return false;
        }

        return true;
    },

    /**
     * Busca o atendente atribuído a um lead
     */
    async getLeadAssignment(leadId: string): Promise<Atendente | null> {
        const { data: lead } = await supabase
            .from('leads')
            .select('assigned_to')
            .eq('id', leadId)
            .single();

        if (!lead?.assigned_to) return null;

        const { data: atendente } = await supabase
            .from('atendentes')
            .select('*')
            .eq('id', lead.assigned_to)
            .single();

        return atendente as Atendente | null;
    }
};
