// Configuração Supabase - mesmas credenciais do Nero Desktop
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jreklrhamersmamdmjna.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'nero-mobile-auth',
    },
});

// Types
export interface Lead {
    id: string;
    name: string;
    phone: string;
    email?: string;
    status: string;
    last_message?: string;
    avatar?: string;
    user_id: string;
    created_at: string;
    updated_at?: string;
    dados?: Record<string, any>;
    assigned_to?: string | null;
    ai_paused?: boolean;
}

/**
 * Returns the display name for a lead, prioritizing dados.nome over name
 */
export const getLeadDisplayName = (lead: Lead): string => {
    // Priority: dados.nome > name
    if (lead.dados && typeof lead.dados === 'object') {
        const dadosNome = (lead.dados as Record<string, any>)['nome'];
        if (dadosNome && typeof dadosNome === 'string' && dadosNome.trim()) {
            return dadosNome.trim();
        }
    }
    return lead.name || 'Sem Nome';
};

export interface Message {
    id: string;
    content: string;
    sender: 'user' | 'client';
    timestamp: string;
}

export interface KanbanColumn {
    id: string;
    name: string;
    position: number;
    user_id: string;
}
