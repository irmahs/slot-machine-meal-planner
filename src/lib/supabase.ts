import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Null when the app is running without Supabase credentials — then everything stays in memory. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
