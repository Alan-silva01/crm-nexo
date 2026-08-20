import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jreklrhamersmamdmjna.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZWtscmhhbWVyc21hbWRtam5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzA0ODgsImV4cCI6MjA4MjM0NjQ4OH0.9I6tnM55U7xTWtVCux0Na1ZOF2myapO3cftZmwBDYLs';


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    }
});

