import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAdminExistsResult {
  adminExists: boolean | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check if at least one admin user exists in the system.
 * Used to determine if first-access setup is needed or should be blocked.
 */
export function useAdminExists(): UseAdminExistsResult {
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAdminExists = async () => {
      try {
        // Query user_roles table to check if any admin exists
        // This is a public check - RLS allows anyone to check role existence
        const { count, error: queryError } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (queryError) {
          throw queryError;
        }

        if (mounted) {
          setAdminExists((count ?? 0) > 0);
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
