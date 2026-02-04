import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAdminExistsResult {
  adminExists: boolean | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check if at least one admin user exists in the system.
 * Uses a secure server-side Edge Function to avoid exposing user_ids.
 */
export function useAdminExists(): UseAdminExistsResult {
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAdminExists = async () => {
      try {
        // Call secure Edge Function that returns only { exists: boolean }
        const { data, error: fnError } = await supabase.functions.invoke('check-admin-exists');

        if (fnError) {
          throw fnError;
        }

        if (mounted) {
          setAdminExists(data?.exists ?? false);
          setError(null);
        }
      } catch (err) {
        console.error('[useAdminExists] Error checking admin existence:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to check admin existence'));
          // Default to true on error to prevent unauthorized access to first-access
          setAdminExists(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAdminExists();

    return () => {
      mounted = false;
    };
  }, []);

  return { adminExists, isLoading, error };
}
