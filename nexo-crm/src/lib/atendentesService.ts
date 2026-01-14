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
     * Detecta se o usuário logado é admin ou atendente
     * Retorna o effectiveUserId (sempre o admin_id para filtrar dados)
     */
    async getUserTypeInfo(): Promise<UserTypeInfo | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Tenta verificar se é atendente (pode falhar se tabela não existir)
            try {
                const { data: atendente, error } = await supabase
                    .from('atendentes')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('ativo', true)
                    .single();

                // Se encontrou e não deu erro, é atendente
                if (atendente && !error) {
                    return {
                        type: 'atendente',
                        effectiveUserId: atendente.admin_id,
                        atendenteInfo: atendente as Atendente
                    };
                }
            } catch (e) {
                // Tabela não existe ou erro de RLS - ignora e trata como admin
                console.log('Atendentes table check skipped:', e);
            }

            // Se não é atendente (ou tabela não existe), é admin
            return {
                type: 'admin',
                effectiveUserId: user.id
            };
        } catch (e) {
            console.error('Error in getUserTypeInfo:', e);
            return null;
        }
    },

    /**
     * Lista todos os atendentes do admin logado
     */
    async listAtendentes(): Promise<Atendente[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('atendentes')
            .select('*')
            .eq('admin_id', user.id)
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
     * Cria um novo atendente
     * Cria usuário no Auth e registro na tabela atendentes
     */
    async createAtendente(nome: string, email: string, senha: string): Promise<{ success: boolean; error?: string }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Não autenticado' };

        // Verificar limite
        const [atendentes, maxAtendentes] = await Promise.all([
            this.listAtendentes(),
            this.getMaxAtendentes()
        ]);

        if (atendentes.length >= maxAtendentes) {
            return { success: false, error: `Limite de ${maxAtendentes} atendentes atingido` };
        }

        // Criar usuário no Auth via Admin API (precisa de Edge Function)
        // Por enquanto, vamos usar signUp normal e depois vincular
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: senha,
            email_confirm: true,
            user_metadata: { full_name: nome, is_atendente: true }
        });

        if (authError || !newUser.user) {
            console.error('Error creating auth user:', authError);
            return { success: false, error: authError?.message || 'Erro ao criar usuário' };
        }

        // Criar registro na tabela atendentes
        const { error: insertError } = await supabase
            .from('atendentes')
            .insert({
                admin_id: user.id,
                user_id: newUser.user.id,
                nome,
                email,
                ativo: true
            });

        if (insertError) {
            console.error('Error inserting atendente:', insertError);
            // Tentar deletar o usuário criado no Auth
            await supabase.auth.admin.deleteUser(newUser.user.id);
            return { success: false, error: insertError.message };
        }

        return { success: true };
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
