import { supabase } from './supabase';
import { Lead } from '../../types';

export const leadsService = {
    async fetchLeads(): Promise<Lead[]> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('No authenticated user');
            return [];
        }

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching leads:', error);
            return [];
        }

        return data as Lead[];
    },

    async updateLead(id: string, updates: Partial<Lead>): Promise<boolean> {
        const { error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating lead:', error);
            return false;
        }

        return true;
    },

    async createLead(lead: Omit<Lead, 'id' | 'user_id'>): Promise<Lead | null> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('No authenticated user');
            return null;
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([{ ...lead, user_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error('Error creating lead:', error);
            return null;
        }

        return data as Lead;
    },

    async deleteLead(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting lead:', error);
            return false;
        }

        return true;
    },

    async recordHistory(leadId: string, fromColumnId: string | null, toColumnId: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('lead_column_history')
            .insert([{
                lead_id: leadId,
                from_column_id: fromColumnId,
                to_column_id: toColumnId,
                user_id: user.id
            }]);

        if (error) {
            console.error('Error recording lead history:', error);
        }
    },

    async fetchHistory(leadId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('lead_column_history')
            .select(`
                *,
                from_column:kanban_columns!from_column_id(name),
                to_column:kanban_columns!to_column_id(name)
            `)
            .eq('lead_id', leadId)
            .order('moved_at', { ascending: false });

        if (error) {
            console.error('Error fetching lead history:', error);
            return [];
        }

        return data;
    },

    async fetchAllHistory(): Promise<any[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('lead_column_history')
            .select(`
                *,
                from_column:kanban_columns!from_column_id(name),
                to_column:kanban_columns!to_column_id(name)
            `)
            .eq('user_id', user.id)
            .order('moved_at', { ascending: true });

        if (error) {
            console.error('Error fetching all lead history:', error);
            return [];
        }

        return data;
    }
};
