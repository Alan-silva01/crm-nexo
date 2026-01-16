import { supabase } from './supabase';
import { atendentesService } from './atendentesService';

export interface Tag {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at?: string;
}

const getTagsCacheKey = (userId: string) => `nexo_tags_cache_${userId}`;

export const tagsService = {
    async listTags(): Promise<Tag[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            console.log('[tagsService] No session, returning empty array');
            return [];
        }

        const userTypeInfo = await atendentesService.getUserTypeInfo(session.user.id, session.user.user_metadata);
        const effectiveUserId = userTypeInfo?.effectiveUserId || session.user.id;

        console.log('[tagsService] Fetching tags for effectiveUserId:', effectiveUserId, 'userType:', userTypeInfo?.type);

        // Try to load from cache first (but always fetch fresh data too)
        const cacheKey = getTagsCacheKey(effectiveUserId);
        const cached = localStorage.getItem(cacheKey);
        let cachedTags: Tag[] = [];
        if (cached) {
            try {
                cachedTags = JSON.parse(cached);
                console.log('[tagsService] Found cached tags:', cachedTags.length);
            } catch (e) {
                console.error('Error parsing tags cache:', e);
            }
        }

        // Fetch from database - RLS handles the filtering now
        // Don't filter by user_id explicitly, let RLS do its job
        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .order('name');

        if (error) {
            console.error('[tagsService] Error listing tags:', error);
            // Return cached if available
            return cachedTags;
        }

        console.log('[tagsService] Fetched tags from DB:', data?.length);

        // Update cache
        if (data && data.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify(data));
        }

        return data as Tag[];
    },

    subscribeToTags(callback: (tags: Tag[]) => void) {
        let subscriptionChannel: any = null;

        const setupSubscription = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const userTypeInfo = await atendentesService.getUserTypeInfo(session.user.id, session.user.user_metadata);
            const effectiveUserId = userTypeInfo?.effectiveUserId || session.user.id;

            subscriptionChannel = supabase
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

        setupSubscription();

        return () => {
            if (subscriptionChannel) {
                supabase.removeChannel(subscriptionChannel);
            }
        };
    },

    async createTag(name: string, color: string): Promise<Tag | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        // Tags são ligadas ao admin
        const userTypeInfo = await atendentesService.getUserTypeInfo(session.user.id, session.user.user_metadata);
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

        // Clear cache so it refreshes
        localStorage.removeItem(getTagsCacheKey(effectiveUserId));

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
