import { supabase } from './supabase';
import { atendentesService } from './atendentesService';

export interface Tag {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at?: string;
}

const TAGS_CACHE_KEY = 'nexo_tags_cache';

export const tagsService = {
    async listTags(): Promise<Tag[]> {
        // Try to load from cache first
        const cached = localStorage.getItem(TAGS_CACHE_KEY);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('Error parsing tags cache:', e);
            }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return [];

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

        // Update cache
        localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(data));
        return data as Tag[];
    },

    subscribeToTags(callback: (tags: Tag[]) => void) {
        let effectiveUserId: string | null = null;

        const setupSubscription = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const userTypeInfo = await atendentesService.getUserTypeInfo();
            effectiveUserId = userTypeInfo?.effectiveUserId || session.user.id;

            return supabase
                .channel('tags-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tags',
                        filter: `user_id=eq.${effectiveUserId}`
                    },
                    async () => {
                        const updatedTags = await this.listTags();
                        callback(updatedTags);
                    }
                )
                .subscribe();
        };

        const subscriptionPromise = setupSubscription();

        return () => {
            subscriptionPromise.then(channel => {
                if (channel) supabase.removeChannel(channel);
            });
        };
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
