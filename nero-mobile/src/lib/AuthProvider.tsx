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
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                determineUserType(session.user);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                determineUserType(session.user);
            } else {
                setUserType(null);
                setEffectiveUserId(null);
                setAtendenteId(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const determineUserType = async (user: User) => {
        const metadata = user.user_metadata;

        // Check if atendente
        if (metadata?.is_atendente && metadata?.admin_id) {
            setUserType('atendente');
            setEffectiveUserId(metadata.admin_id);
            // Optionally fetch the atendente.id from the table if not in metadata
            // But usually we need it for filtering leads.assigned_to
        }

        // Always try to fetch from table for most accurate info
        if (user) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .single();

            if (profileData) {
                setUserType('admin');
                setEffectiveUserId(user.id);
                setAtendenteId(null);
            } else {
                const { data: atendenteData } = await supabase
                    .from('atendentes')
                    .select('id, admin_id')
                    .eq('user_id', user.id)
                    .single();

                if (atendenteData) {
                    setUserType('atendente');
                    setEffectiveUserId(atendenteData.admin_id);
                    setAtendenteId(atendenteData.id);
                }
            }
        }
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
