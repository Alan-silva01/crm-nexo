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
    async getUserTypeInfo(userId?: string): Promise<UserTypeInfo | null> {
        try {
            let targetUserId = userId;
            let metadata: any = null;

            if (!targetUserId) {
                const { data: { session } } = await supabase.auth.getSession();
                targetUserId = session?.user?.id;
                metadata = session?.user?.user_metadata;
            } else {
                // Se o userId foi passado, tentar buscar metadata se for o logado
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id === targetUserId) {
                    metadata = session.user.user_metadata;
                }
            }

            if (!targetUserId) return null;

            const isAtendenteMetadata = metadata?.is_atendente === true;

            // Busca na tabela atendentes com tentativa de retry mais agressiva se metadata diz que é atendente
            let atendente = null;
            let error = null;
            const maxRetries = isAtendenteMetadata ? 5 : 2;

            for (let i = 0; i < maxRetries; i++) {
                const result = await supabase
                    .from('atendentes')
                    .select('*')
                    .eq('user_id', targetUserId)
                    .eq('ativo', true)
                    .maybeSingle();

                atendente = result.data;
                error = result.error;

                if (!error && (atendente || !isAtendenteMetadata)) break;

                console.log(`getUserTypeInfo retry ${i + 1}/${maxRetries}...`);
                await new Promise(r => setTimeout(r, 500 * (i + 1)));
            }

            if (atendente) {
                return {
                    type: 'atendente',
                    effectiveUserId: atendente.admin_id,
                    atendenteInfo: atendente as Atendente
                };
            }

            // Se o metadata diz que deve ser atendente mas não achamos no banco após retries
            if (isAtendenteMetadata) {
                console.error('User metadata says is_atendente=true but no record found in atendentes table.');
                // Não assumimos admin aqui, pois isso causaria dados zerados no app.
                // Lançamos erro para o AuthProvider lidar ou tentar novamente depois.
                throw new Error('Atendente record not found for user marked as atendente in metadata.');
            }

            // Se não encontrou registro e não tem flag de atendente, é admin
            return {
                type: 'admin',
                effectiveUserId: targetUserId
            };
        } catch (e) {
            console.error('Critical failure in getUserTypeInfo:', e);
            throw e;
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
