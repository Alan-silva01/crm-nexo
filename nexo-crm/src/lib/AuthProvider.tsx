import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';
import { atendentesService, Atendente, UserTypeInfo } from './atendentesService';

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    loading: boolean;
    userType: 'admin' | 'atendente' | null;
    effectiveUserId: string | null; // ID do admin (para filtrar dados)
    atendenteInfo: Atendente | null; // Info do atendente se for atendente
    signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
    signUp: (email: string, password: string, name?: string, company_name?: string) => Promise<{ error: any; data: any }>;
    signOut: () => Promise<{ error: any }>;
    refreshUserType: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userType, setUserType] = useState<'admin' | 'atendente' | null>(null);
    const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
    const [atendenteInfo, setAtendenteInfo] = useState<Atendente | null>(null);

    const fetchUserType = async (userId: string) => {
        try {
            console.log('Fetching user type for:', userId);

            // 1. Tentar pegar do cache primeiro para resposta instantânea
            const cached = localStorage.getItem(`auth_user_type_${userId}`);
            if (cached) {
                const info = JSON.parse(cached);
                console.log('Using cached user type:', info.type);
                setUserType(info.type);
                setEffectiveUserId(info.effectiveUserId);
                setAtendenteInfo(info.atendenteInfo || null);
            }

            // 2. Buscar do banco para garantir que está atualizado
            // Se o cache já nos deu o que precisávamos, o banco é para sincronia
            const info = await atendentesService.getUserTypeInfo(userId);
            if (info) {
                console.log('Fetched user type from DB:', info.type);
                setUserType(info.type);
                setEffectiveUserId(info.effectiveUserId);
                setAtendenteInfo(info.atendenteInfo || null);
                localStorage.setItem(`auth_user_type_${userId}`, JSON.stringify(info));
                return info;
            }
        } catch (e) {
            console.error('Error in fetchUserType:', e);
            // Se o metadado diz que é atendente mas falhou tudo, não deixa carregar como admin
            return null;
        }
        return null;
    };

    useEffect(() => {
        let isMounted = true;
        let initialized = false;

        const initializeAuth = async (currSession: Session | null) => {
            if (initialized && currSession?.user?.id === user?.id) return;
            initialized = true;

            try {
                if (currSession?.user) {
                    setSession(currSession);
                    setUser(currSession.user);

                    // Se temos admin_id no metadata (novos atendentes), podemos usar direto!
                    const metaAdminId = currSession.user.user_metadata?.admin_id;
                    const isAtendente = currSession.user.user_metadata?.is_atendente;

                    if (isAtendente && metaAdminId) {
                        console.log('AuthProvider: Using admin_id from metadata');
                        setUserType('atendente');
                        setEffectiveUserId(metaAdminId);
                    }

                    // Tentar determinar o tipo de usuário com algumas retentativas
                    let info = null;
                    for (let i = 0; i < 3; i++) {
                        info = await fetchUserType(currSession.user.id);
                        if (info) break;
                        if (isAtendente && !metaAdminId) {
                            console.warn(`AuthProvider: Retry ${i + 1} finding atendente record...`);
                            await new Promise(r => setTimeout(r, 1000));
                        } else {
                            break;
                        }
                    }

                    // Se falhou e é marcados como atendente, mas não temos ID, não libera o loading
                    if (isAtendente && !effectiveUserId && !info) {
                        console.error('AuthProvider: Failed to determine attendant admin_id.');
                        // Poderíamos redirecionar ou mostrar erro, mas por enquanto vamos forçar loading false
                        // para o App lidar com o estado vazio, mas avisando o dev.
                    }
                } else {
                    setSession(null);
                    setUser(null);
                    setUserType(null);
                    setEffectiveUserId(null);
                    setAtendenteInfo(null);
                }
            } catch (e) {
                console.error('Auth initialization error:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
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
                setUserType(null);
                setEffectiveUserId(null);
                setAtendenteInfo(null);
                setLoading(false);
                // Limpar todos os caches de tipo de usuário
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('auth_user_type_')) localStorage.removeItem(key);
                });
            }
        });

        // Fallback imediato
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            if (isMounted && !initialized) {
                initializeAuth(initialSession);
            }
        });

        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.session) {
            await fetchUserType(data.session.user.id);
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
        const { error } = await supabase.auth.signOut();
        setUserType(null);
        setEffectiveUserId(null);
        setAtendenteInfo(null);
        return { error };
    };

    const refreshUserType = async () => {
        if (user) {
            await fetchUserType(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            userType,
            effectiveUserId,
            atendenteInfo,
            signIn,
            signUp,
            signOut,
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
