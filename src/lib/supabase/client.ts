import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The browser client, or null when the app is running without credentials — then everything
 * stays in memory. This is a single-page app, so there is no server client: the anon key and
 * row-level security are what stand between a request and someone else's fridge.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isConfigured = supabase !== null;
