import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validation - throw clear errors if not configured
if (!supabaseUrl) {
  console.error('[Supabase] ERRO CRÍTICO: VITE_SUPABASE_URL não está configurada!');
}

if (!supabaseAnonKey) {
  console.error('[Supabase] ERRO CRÍTICO: VITE_SUPABASE_ANON_KEY não está configurada!');
}

// Log URL in development (never log the key)
if (import.meta.env.DEV) {
  console.log('[Supabase] Conectando a:', supabaseUrl);
}

// Export validation state for UI feedback
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseConnectionError = !supabaseUrl 
  ? 'VITE_SUPABASE_URL não configurada' 
  : !supabaseAnonKey 
    ? 'VITE_SUPABASE_ANON_KEY não configurada' 
    : null;

// Create and export the client
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
