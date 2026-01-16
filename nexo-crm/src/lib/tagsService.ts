import { supabase } from './supabase';
import { atendentesService } from './atendentesService';

export interface Tag {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at?: string;
}

export const tagsService = {
    async listTags(): Promise<Tag[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return [];

        // Descobrir effectiveUserId (para atendentes verem tags do admin)
        const userTypeInfo = await atendentesService.getUserTypeInfo();
        const effectiveUserId = userTypeInfo?.effectiveUserId || session.user.id;

        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('user_id', effectiveUserId)
            .order('name');

        if (error) {
            console.error('Error listing tags:', error);
            return [];
        }

        return data as Tag[];
    },

    async createTag(name: string, color: string): Promise<Tag | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        // Tags são ligadas ao admin
        const userTypeInfo = await atendentesService.getUserTypeInfo();
        const effectiveUserId = userTypeInfo?.effectiveUserId || session.user.id;

        const { data, error } = await supabase
            .from('tags')
            .insert([{ name, color, user_id: effectiveUserId }])
            .select()
            .single();

        if (error) {
            console.error('Error creating tag:', error);
            return null;
        }

        return data as Tag;
    },

    async updateTag(id: string, updates: Partial<Tag>): Promise<boolean> {
        const { error } = await supabase
            .from('tags')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating tag:', error);
            return false;
        }

        return true;
    },

    async deleteTag(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting tag:', error);
            return false;
        }

        return true;
    }
};
