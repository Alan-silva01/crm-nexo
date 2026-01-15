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

    const fetchUserType = async (userId: string, metadata?: any) => {
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
                // Mesmo com cache, vamos atualizar no background
            }

            // 2. Buscar do banco para garantir que está atualizado
            const info = await atendentesService.getUserTypeInfo(userId, metadata);
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
            if (initialized && currSession?.user?.id === user?.id) {
                if (currSession?.user && loading) setLoading(false);
                return;
            }
            initialized = true;

            try {
                // Failsafe: se demorar mais de 10s pra inicializar, libera o app anyway
                const timer = setTimeout(() => {
                    if (isMounted && loading) {
                        console.warn('AuthProvider: Initialization took too long, forcing loading(false)');
                        setLoading(false);
                    }
                }, 10000);

                if (currSession?.user) {
                    setSession(currSession);
                    setUser(currSession.user);

                    // RESTAURAR DO CACHE IMEDIATAMENTE para todos os usuários
                    const cached = localStorage.getItem(`auth_user_type_${currSession.user.id}`);
                    if (cached) {
                        try {
                            const cachedInfo = JSON.parse(cached);
                            console.log('AuthProvider: Restoring from cache:', cachedInfo.type, cachedInfo.effectiveUserId);
                            setUserType(cachedInfo.type);
                            setEffectiveUserId(cachedInfo.effectiveUserId);
                            setAtendenteInfo(cachedInfo.atendenteInfo || null);
                            setLoading(false); // Liberar imediatamente com dados do cache
                        } catch (e) {
                            console.error('AuthProvider: Error parsing cached user type:', e);
                        }
                    }

                    const metaAdminId = currSession.user.user_metadata?.admin_id;
                    const isAtendente = currSession.user.user_metadata?.is_atendente;

                    if (isAtendente && metaAdminId) {
                        console.log('AuthProvider: User is an atendente based on metadata. Admin ID:', metaAdminId);
                        setUserType('atendente');
                        setEffectiveUserId(metaAdminId);
                        console.log('AuthProvider: Setting loading(false) early due to atendente metadata.');
                        setLoading(false);
                    } else if (!cached) {
                        // Só loga se não tinha cache
                        console.log('AuthProvider: No atendente metadata and no cache found.');
                    }

                    // Tentar determinar o tipo de usuário (pode rodar em paralelo se já liberamos loading)
                    await fetchUserType(currSession.user.id, currSession.user.user_metadata);
                } else {
                    console.log('AuthProvider: No active session found.');
                    setSession(null);
                    setUser(null);
                    setUserType(null);
                    setEffectiveUserId(null);
                    setAtendenteInfo(null);
                }
                clearTimeout(timer);
            } catch (e) {
                console.error('AuthProvider initialization error:', e);
            } finally {
                console.log('AuthProvider: initialization finished, setting loading false');
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
            await fetchUserType(data.session.user.id, data.session.user.user_metadata);
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
        await supabase.auth.signOut();
        // Clear all caches and reload to ensure a fresh state
        localStorage.clear();
        setUserType(null);
        setEffectiveUserId(null);
        setAtendenteInfo(null);
        window.location.href = '/';
        return { error: null };
    };

    const refreshUserType = async () => {
        if (user) {
            await fetchUserType(user.id, user.user_metadata);
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
