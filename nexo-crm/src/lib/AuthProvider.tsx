import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { tenantService, CurrentUserInfo, TenantUser } from './tenantService';
// Manter import para compatibilidade durante transição
import { Atendente, convertToLegacyAtendente } from './tenantService';

type UserRole = 'owner' | 'admin' | 'atendente' | 'viewer';

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    loading: boolean;
    // Novos campos (multi-tenant)
    userInfo: CurrentUserInfo | null;
    tenantId: string | null;
    // Campos legados (compatibilidade)
    userType: 'admin' | 'atendente' | null;
    effectiveUserId: string | null;
    atendenteInfo: Atendente | null;
    // Métodos
    signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
    signUp: (email: string, password: string, name?: string, company_name?: string) => Promise<{ error: any; data: any }>;
    signOut: () => Promise<{ error: any }>;
    refreshUserInfo: () => Promise<void>;
    // Alias para compatibilidade
    refreshUserType: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Novos estados multi-tenant
    const [userInfo, setUserInfo] = useState<CurrentUserInfo | null>(null);

    // Estados legados (derivados de userInfo para compatibilidade)
    const [userType, setUserType] = useState<'admin' | 'atendente' | null>(null);
    const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
    const [atendenteInfo, setAtendenteInfo] = useState<Atendente | null>(null);

    const fetchUserInfo = async (userId: string): Promise<CurrentUserInfo | null> => {
        try {
            console.log('AuthProvider: Fetching user info for:', userId);

            // 1. PRIORIDADE: Restaurar do cache IMEDIATAMENTE se existir
            const cached = localStorage.getItem(`auth_tenant_user_${userId}`);
            if (cached) {
                try {
                    const cachedInfo = JSON.parse(cached) as CurrentUserInfo;
                    console.log('AuthProvider: ✅ CACHE HIT - Restoring immediately:', cachedInfo.role, cachedInfo.tenantName);
                    updateUserState(cachedInfo);

                    // Buscar do banco em BACKGROUND (não bloqueia retorno)
                    tenantService.getCurrentUserInfo(userId).then(freshInfo => {
                        if (freshInfo) {
                            console.log('AuthProvider: 🔄 Background refresh complete:', freshInfo.role);
                            updateUserState(freshInfo);
                            localStorage.setItem(`auth_tenant_user_${userId}`, JSON.stringify(freshInfo));
                        }
                    }).catch(e => {
                        console.warn('AuthProvider: Background refresh failed (using cache):', e);
                    });

                    return cachedInfo; // Retorna cache imediatamente!
                } catch (e) {
                    console.error('AuthProvider: Error parsing cached user info:', e);
                }
            }

            // 2. Sem cache: Buscar do banco (bloqueia)
            console.log('AuthProvider: ⏳ No cache, fetching from DB...');
            const info = await tenantService.getCurrentUserInfo(userId);
            if (info) {
                console.log('AuthProvider: ✅ Fetched from DB:', info.role, info.tenantName);
                updateUserState(info);
                localStorage.setItem(`auth_tenant_user_${userId}`, JSON.stringify(info));
                return info;
            }
        } catch (e) {
            console.error('AuthProvider: Error in fetchUserInfo:', e);
        }
        return null;
    };

    // Atualiza todos os estados (novos e legados)
    const updateUserState = (info: CurrentUserInfo | null) => {
        setUserInfo(info);

        if (info) {
            // Estados novos já vêm do info
            // Estados legados derivados
            setUserType(info.isOwnerOrAdmin ? 'admin' : 'atendente');
            setEffectiveUserId(info.tenantId);

            if (info.isAtendente) {
                setAtendenteInfo({
                    id: info.tenantUserId,
                    admin_id: info.tenantId,
                    user_id: '', // Não temos mais separado
                    nome: info.userName,
                    email: info.userEmail || '',
                    ativo: true,
                    created_at: ''
                });
            } else {
                setAtendenteInfo(null);
            }
        } else {
            setUserType(null);
            setEffectiveUserId(null);
            setAtendenteInfo(null);
        }
    };

    useEffect(() => {
        let isMounted = true;
        let initialized = false;

        const initializeAuth = async (currSession: Session | null) => {
            if (initialized && currSession?.user?.id === user?.id) {
                if (currSession?.user && loading) setLoading(false);
                return;
            }
            initialized = true;

            try {
                // Failsafe: se demorar mais de 20s, libera o app
                const timer = setTimeout(() => {
                    if (isMounted && loading) {
                        console.warn('AuthProvider: Initialization took too long, forcing loading(false)');
                        setLoading(false);
                    }
                }, 20000);

                if (currSession?.user) {
                    // PRIMEIRO: Verificar se é atendente inativo ANTES de qualquer coisa
                    const { data: tenantUser } = await supabase
                        .from('tenant_users')
                        .select('ativo, role')
                        .eq('user_id', currSession.user.id)
                        .single();

                    // Se é atendente inativo, fazer logout imediato
                    if (tenantUser && tenantUser.role === 'atendente' && tenantUser.ativo === false) {
                        console.log('AuthProvider: ❌ Atendente inativo detectado, fazendo logout...');
                        localStorage.removeItem(`auth_tenant_user_${currSession.user.id}`);
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                        updateUserState(null);
                        clearTimeout(timer);
                        if (isMounted) setLoading(false);
                        return; // Interrompe aqui, não prossegue com login
                    }

                    setSession(currSession);
                    setUser(currSession.user);

                    // Buscar info do usuário do banco (ou cache se existir)
                    // CRÍTICO: Aguardar conclusão antes de liberar loading
                    const userInfoResult = await fetchUserInfo(currSession.user.id);

                    // Se não encontrou no banco, tentar metadata do usuário (atendentes antigos)
                    if (!userInfoResult) {
                        const metaAdminId = currSession.user.user_metadata?.admin_id;
                        const isAtendente = currSession.user.user_metadata?.is_atendente;

                        if (isAtendente && metaAdminId) {
                            console.log('AuthProvider: User is an atendente based on metadata. Tenant ID:', metaAdminId);
                            setUserType('atendente');
                            setEffectiveUserId(metaAdminId);
                        }
                    }
                } else {
                    console.log('AuthProvider: No active session found.');
                    setSession(null);
                    setUser(null);
                    updateUserState(null);
                }
                clearTimeout(timer);
            } catch (e) {
                console.error('AuthProvider initialization error:', e);
            }
            // Garantir que loading seja sempre liberado ao final
            console.log('AuthProvider: initialization finished, setting loading false');
            if (isMounted) setLoading(false);
        };

        // Listen for changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (!isMounted) return;
            console.log('Auth Event:', event);

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                await initializeAuth(newSession);
            } else if (event === 'SIGNED_OUT') {
                initialized = false;
                setSession(null);
                setUser(null);
                updateUserState(null);
                setLoading(false);
                // Limpar todos os caches
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('auth_tenant_user_') || key.startsWith('auth_user_type_')) {
                        localStorage.removeItem(key);
                    }
                });
            }
        });

        // Initialize session
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            if (isMounted && !initialized) {
                initializeAuth(initialSession);
            }
        }).catch(err => {
            console.error('AuthProvider: getSession error:', err);
            if (isMounted) setLoading(false);
        });

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.session) {
            // PRIMEIRO: Verificar status ativo ANTES de carregar cache
            // Isso garante que atendentes inativos sejam bloqueados imediatamente
            const { data: tenantUser } = await supabase
                .from('tenant_users')
                .select('ativo, role')
                .eq('user_id', data.session.user.id)
                .single();

            // Se encontrou registro e é atendente inativo, bloquear login
            if (tenantUser && tenantUser.role === 'atendente' && tenantUser.ativo === false) {
                // Limpar cache para evitar login com dados antigos
                localStorage.removeItem(`auth_tenant_user_${data.session.user.id}`);
                await supabase.auth.signOut();
                updateUserState(null);
                return {
                    data: null,
                    error: { message: 'Sua conta foi desativada. Entre em contato com o administrador.' }
                };
            }

            // Só buscar info completa se passou na verificação
            await fetchUserInfo(data.session.user.id);
        }
        return { data, error };
    };

    const signUp = async (email: string, password: string, name?: string, company_name?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    company_name: company_name
                }
            }
        });
        return { data, error };
    };

    const signOut = async () => {
        console.log('AuthProvider: signOut initiated');
        try {
            // Preservar preferência de tema
            const savedTheme = localStorage.getItem('nero-theme');

            // Limpar todos os caches de autenticação
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('auth_tenant_user_') ||
                    key.startsWith('auth_user_type_') ||
                    key.startsWith('nero_leads_cache') ||
                    key.startsWith('sb-')) {
                    localStorage.removeItem(key);
                }
            });

            // Restaurar preferência de tema
            if (savedTheme) {
                localStorage.setItem('nero-theme', savedTheme);
            }

            updateUserState(null);
            await supabase.auth.signOut();
        } catch (e) {
            console.error('AuthProvider: error during signOut, proceeding with local cleanup:', e);
        } finally {
            window.location.href = '/';
        }
        return { error: null };
    };

    const refreshUserInfo = async () => {
        if (user) {
            await fetchUserInfo(user.id);
        }
    };

    // Alias para compatibilidade
    const refreshUserType = refreshUserInfo;

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            // Novos campos
            userInfo,
            tenantId: userInfo?.tenantId || null,
            // Campos legados
            userType,
            effectiveUserId,
            atendenteInfo,
            // Métodos
            signIn,
            signUp,
            signOut,
            refreshUserInfo,
            refreshUserType
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
