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
            const info = await atendentesService.getUserTypeInfo(userId);
            if (info) {
                setUserType(info.type);
                setEffectiveUserId(info.effectiveUserId);
                setAtendenteInfo(info.atendenteInfo || null);
            }
        } catch (e) {
            console.error('Error fetching user type in AuthProvider:', e);
            // Default to admin on error to prevent total lock
            setUserType('admin');
            setEffectiveUserId(userId);
        }
    };

    useEffect(() => {
        let isMounted = true;

        // Safety timeout: never stay in loading for more than 5 seconds
        const safetyTimeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Auth loading timed out, forcing loading false');
                setLoading(false);
            }
        }, 5000);

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                try {
                    await fetchUserType(session.user.id);
                } catch (e) {
                    console.error('Initial user type fetch failed:', e);
                }
            } else {
                setUserType(null);
                setEffectiveUserId(null);
                setAtendenteInfo(null);
            }

            if (isMounted) setLoading(false);
        });

        // Check initial session immediately as well
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!isMounted) return;

            if (session) {
                setSession(session);
                setUser(session.user);
                try {
                    await fetchUserType(session.user.id);
                } catch (e) {
                    console.error('Initial session fetch failed:', e);
                }
            } else {
                setUserType(null);
                setEffectiveUserId(null);
                setAtendenteInfo(null);
            }
            if (isMounted) setLoading(false);
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
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
