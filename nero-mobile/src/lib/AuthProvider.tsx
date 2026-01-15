import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextProps {
    user: User | null;
    session: Session | null;
    loading: boolean;
    userType: 'admin' | 'atendente' | null;
    effectiveUserId: string | null;
    atendenteId: string | null;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userType, setUserType] = useState<'admin' | 'atendente' | null>(null);
    const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
    const [atendenteId, setAtendenteId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const initialize = async (session: Session | null) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await determineUserType(session.user);
            } else {
                setUserType(null);
                setEffectiveUserId(null);
                setAtendenteId(null);
            }
            if (isMounted) setLoading(false);
        };

        // Failsafe timeout
        const timer = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('[AuthProvider] Initialization timeout, forcing loading(false)');
                setLoading(false);
            }
        }, 15000);

        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted) initialize(session);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) initialize(session);
        });

        return () => {
            isMounted = false;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    const determineUserType = async (user: User) => {
        const metadata = user.user_metadata;
        console.log('[AuthProvider] Determining user type for:', user.id, 'metadata:', metadata);

        // FIRST: Check if user is an atendente (from metadata for instant load)
        if (metadata?.is_atendente === true && metadata?.admin_id) {
            console.log('[AuthProvider] Found atendente in metadata, admin_id:', metadata.admin_id);
            // Also fetch the atendente.id from DB for filtering leads
            const { data: atendenteData } = await supabase
                .from('atendentes')
                .select('id, admin_id')
                .eq('user_id', user.id)
                .eq('ativo', true)
                .single();

            if (atendenteData) {
                setUserType('atendente');
                setEffectiveUserId(atendenteData.admin_id);
                setAtendenteId(atendenteData.id);
                console.log('[AuthProvider] Set as atendente, effectiveUserId:', atendenteData.admin_id, 'atendenteId:', atendenteData.id);
                return;
            }
        }

        // SECOND: Check atendentes table directly (in case metadata is missing)
        const { data: atendenteData } = await supabase
            .from('atendentes')
            .select('id, admin_id')
            .eq('user_id', user.id)
            .eq('ativo', true)
            .single();

        if (atendenteData) {
            setUserType('atendente');
            setEffectiveUserId(atendenteData.admin_id);
            setAtendenteId(atendenteData.id);
            console.log('[AuthProvider] Set as atendente from DB, effectiveUserId:', atendenteData.admin_id);
            return;
        }

        // THIRD: If not atendente, check if admin (has profile)
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (profileData) {
            setUserType('admin');
            setEffectiveUserId(user.id);
            setAtendenteId(null);
            console.log('[AuthProvider] Set as admin, effectiveUserId:', user.id);
            return;
        }

        // Fallback: treat as admin (shouldn't happen in normal flow)
        console.warn('[AuthProvider] No profile or atendente found, defaulting to admin');
        setUserType('admin');
        setEffectiveUserId(user.id);
        setAtendenteId(null);
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, userType, effectiveUserId, atendenteId, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
