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
    }
};
