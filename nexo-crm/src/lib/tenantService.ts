import { supabase } from './supabase';

// ============================================
// TIPOS
// ============================================

export type UserRole = 'owner' | 'admin' | 'atendente' | 'viewer';

export interface Tenant {
    id: string;
    name: string;
    slug: string | null;
    settings: Record<string, unknown>;
    max_users: number;
    created_at: string;
    updated_at: string;
}

export interface TenantUser {
    id: string;
    tenant_id: string;
    user_id: string;
    role: UserRole;
    nome: string;
    email: string | null;
    ativo: boolean;
    permissions: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface TenantUserInfo {
    tenantUser: TenantUser;
    tenant: Tenant;
}

/**
 * Informações do usuário atual para uso no app
 */
export interface CurrentUserInfo {
    role: UserRole;
    tenantId: string;  // ID do tenant (usado para filtrar dados)
    tenantUserId: string; // ID do registro em tenant_users
    tenantName: string;
    userName: string;
    userEmail: string | null;
    isOwnerOrAdmin: boolean;
    isAtendente: boolean;
}

// ============================================
// SERVIÇO
// ============================================

export const tenantService = {
    /**
     * Obtém informações do usuário atual (tenant, role, etc.)
     * Esta é a função principal - substitui atendentesService.getUserTypeInfo()
     * Inclui retry robusto para evitar falhas após refresh
     */
    async getCurrentUserInfo(userId?: string): Promise<CurrentUserInfo | null> {
        const requestId = Math.random().toString(36).substring(7);
        try {
            let targetUserId = userId;

            if (!targetUserId) {
                // Aguardar sessão estabilizar com retry
                let sessionRetries = 5;
                while (sessionRetries > 0) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        targetUserId = session.user.id;
                        break;
                    }
                    sessionRetries--;
                    if (sessionRetries > 0) {
                        console.log(`[${requestId}] Waiting for session... (${5 - sessionRetries}/5)`);
                        await new Promise(r => setTimeout(r, 300));
                    }
                }

                if (!targetUserId) {
                    console.log(`[${requestId}] No session found after retries`);
                    return null;
                }
            }

            console.log(`[${requestId}] Getting user info for:`, targetUserId);

            // Retry para query de tenant_users (pode falhar logo após refresh)
            let retries = 5;
            let delay = 200;
            let tenantUser = null;
            let lastError = null;

            while (retries > 0 && !tenantUser) {
                const { data, error } = await supabase
                    .from('tenant_users')
                    .select(`
                        *,
                        tenant:tenants(*)
                    `)
                    .eq('user_id', targetUserId)
                    .eq('ativo', true)
                    .maybeSingle();

                if (error) {
                    lastError = error;
                    console.warn(`[${requestId}] Retry ${6 - retries}/5 failed:`, error.message);
                } else if (data) {
                    tenantUser = data;
                    break;
                }

                retries--;
                if (retries > 0) {
                    await new Promise(r => setTimeout(r, delay));
                    delay = Math.min(delay * 1.5, 1500);
                }
            }

            if (lastError && !tenantUser) {
                console.error(`[${requestId}] All retries failed:`, lastError);
                return null;
            }

            if (!tenantUser) {
                console.log(`[${requestId}] No tenant user found for:`, targetUserId);
                return null;
            }

            const tenant = tenantUser.tenant as Tenant;
            const role = tenantUser.role as UserRole;

            console.log(`[${requestId}] Found user: ${tenantUser.nome}, role: ${role}, tenant: ${tenant?.name}`);

            return {
                role,
                tenantId: tenantUser.tenant_id,
                tenantUserId: tenantUser.id,
                tenantName: tenant?.name || 'Unknown',
                userName: tenantUser.nome,
                userEmail: tenantUser.email,
                isOwnerOrAdmin: role === 'owner' || role === 'admin',
                isAtendente: role === 'atendente'
            };
        } catch (e) {
            console.error(`[${requestId}] Error in getCurrentUserInfo:`, e);
            return null;
        }
    },


    /**
     * Lista todos os membros do tenant atual
     * Substitui atendentesService.listAtendentes()
     */
    async listTenantMembers(tenantId?: string): Promise<TenantUser[]> {
        try {
            let targetTenantId = tenantId;

            if (!targetTenantId) {
                const userInfo = await this.getCurrentUserInfo();
                if (!userInfo) return [];
                targetTenantId = userInfo.tenantId;
            }

            const { data, error } = await supabase
                .from('tenant_users')
                .select('*')
                .eq('tenant_id', targetTenantId)
                .order('role', { ascending: true })
                .order('nome', { ascending: true });

            if (error) {
                console.error('Error listing tenant members:', error);
                return [];
            }

            return data as TenantUser[];
        } catch (e) {
            console.error('Error in listTenantMembers:', e);
            return [];
        }
    },

    /**
     * Lista apenas os atendentes do tenant
     */
    async listAtendentes(tenantId?: string): Promise<TenantUser[]> {
        const members = await this.listTenantMembers(tenantId);
        return members.filter(m => m.role === 'atendente' && m.ativo);
    },

    /**
     * Obtém o limite de usuários do tenant
     */
    async getMaxUsers(): Promise<number> {
        try {
            const userInfo = await this.getCurrentUserInfo();
            if (!userInfo) return 0;

            const { data: tenant } = await supabase
                .from('tenants')
                .select('max_users')
                .eq('id', userInfo.tenantId)
                .single();

            return tenant?.max_users || 5;
        } catch (e) {
            console.error('Error getting max users:', e);
            return 5;
        }
    },

    /**
     * Cria um novo membro do tenant (atendente)
     * Usa Edge Function para criar usuário no Auth
     */
    async createTenantMember(
        nome: string,
        email: string,
        senha: string,
        role: UserRole = 'atendente'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const userInfo = await this.getCurrentUserInfo();
            if (!userInfo) {
                return { success: false, error: 'Não autenticado' };
            }

            if (!userInfo.isOwnerOrAdmin) {
                return { success: false, error: 'Sem permissão para criar membros' };
            }

            // Chamar Edge Function que usa Service Role Key
            const { data, error } = await supabase.functions.invoke('create-tenant-user', {
                body: {
                    nome,
                    email,
                    senha,
                    role,
                    tenant_id: userInfo.tenantId
                }
            });

            if (error) {
                console.error('Error calling create-tenant-user function:', error);
                return { success: false, error: error.message };
            }

            if (data?.error) {
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (e: any) {
            console.error('Error creating tenant member:', e);
            return { success: false, error: e.message || 'Erro desconhecido' };
        }
    },

    /**
     * Ativa ou desativa um membro do tenant
     */
    async toggleMemberStatus(tenantUserId: string, ativo: boolean): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('tenant_users')
                .update({ ativo, updated_at: new Date().toISOString() })
                .eq('id', tenantUserId);

            if (error) {
                console.error('Error toggling member status:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Error in toggleMemberStatus:', e);
            return false;
        }
    },

    /**
     * Remove um membro do tenant
     */
    async deleteMember(tenantUserId: string): Promise<boolean> {
        try {
            // Primeiro buscar o user_id para poder deletar do Auth
            const { data: member } = await supabase
                .from('tenant_users')
                .select('user_id, role')
                .eq('id', tenantUserId)
                .single();

            if (!member) return false;

            // Não permitir deletar o owner
            if (member.role === 'owner') {
                console.error('Cannot delete tenant owner');
                return false;
            }

            // Deletar do Auth (via Edge Function ou admin API)
            // Por enquanto, apenas desativar
            const { error } = await supabase
                .from('tenant_users')
                .delete()
                .eq('id', tenantUserId);

            if (error) {
                console.error('Error deleting member:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Error in deleteMember:', e);
            return false;
        }
    },

    /**
     * Atribui um lead a um membro do tenant
     */
    async assignLeadToMember(leadId: string, tenantUserId: string | null): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('leads')
                .update({ assigned_to: tenantUserId })
                .eq('id', leadId);

            if (error) {
                console.error('Error assigning lead:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Error in assignLeadToMember:', e);
            return false;
        }
    },

    /**
     * Busca o membro atribuído a um lead
     */
    async getLeadAssignment(leadId: string): Promise<TenantUser | null> {
        try {
            const { data: lead } = await supabase
                .from('leads')
                .select('assigned_to')
                .eq('id', leadId)
                .single();

            if (!lead?.assigned_to) return null;

            const { data: member } = await supabase
                .from('tenant_users')
                .select('*')
                .eq('id', lead.assigned_to)
                .single();

            return member as TenantUser | null;
        } catch (e) {
            console.error('Error in getLeadAssignment:', e);
            return null;
        }
    },

    /**
     * Obtém informações do tenant atual
     */
    async getCurrentTenant(): Promise<Tenant | null> {
        try {
            const userInfo = await this.getCurrentUserInfo();
            if (!userInfo) return null;

            const { data: tenant } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', userInfo.tenantId)
                .single();

            return tenant as Tenant | null;
        } catch (e) {
            console.error('Error getting current tenant:', e);
            return null;
        }
    },

    /**
     * Atualiza configurações do tenant
     */
    async updateTenantSettings(settings: Partial<Tenant>): Promise<boolean> {
        try {
            const userInfo = await this.getCurrentUserInfo();
            if (!userInfo || userInfo.role !== 'owner') {
                console.error('Only owner can update tenant settings');
                return false;
            }

            const { error } = await supabase
                .from('tenants')
                .update({ ...settings, updated_at: new Date().toISOString() })
                .eq('id', userInfo.tenantId);

            if (error) {
                console.error('Error updating tenant:', error);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Error in updateTenantSettings:', e);
            return false;
        }
    }
};

// ============================================
// COMPATIBILIDADE COM CÓDIGO ANTIGO
// Essas funções facilitam a migração gradual
// ============================================

export interface Atendente {
    id: string;
    admin_id: string;  // Agora é tenant_id
    user_id: string;
    nome: string;
    email: string;
    ativo: boolean;
    created_at: string;
}

export interface UserTypeInfo {
    type: 'admin' | 'atendente';
    effectiveUserId: string;  // Agora é tenantId
    atendenteInfo?: Atendente;
}

/**
 * Função de compatibilidade - converte CurrentUserInfo para UserTypeInfo antigo
 */
export const convertToLegacyUserTypeInfo = (info: CurrentUserInfo | null): UserTypeInfo | null => {
    if (!info) return null;

    const legacyType = info.isOwnerOrAdmin ? 'admin' : 'atendente';

    const result: UserTypeInfo = {
        type: legacyType,
        effectiveUserId: info.tenantId
    };

    // Se for atendente, incluir atendenteInfo para compatibilidade
    if (info.isAtendente) {
        result.atendenteInfo = {
            id: info.tenantUserId,
            admin_id: info.tenantId,
            user_id: '', // Não temos mais esse campo separado
            nome: info.userName,
            email: info.userEmail || '',
            ativo: true,
            created_at: ''
        };
    }

    return result;
};

/**
 * Converte TenantUser para Atendente (compatibilidade)
 */
export const convertToLegacyAtendente = (member: TenantUser): Atendente => {
    return {
        id: member.id,
        admin_id: member.tenant_id,
        user_id: member.user_id,
        nome: member.nome,
        email: member.email || '',
        ativo: member.ativo,
        created_at: member.created_at
    };
};
