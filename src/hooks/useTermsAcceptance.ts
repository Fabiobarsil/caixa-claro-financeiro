import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Version should be updated when terms change significantly
export const CURRENT_TERMS_VERSION = '1.0.0';

interface TermsAcceptance {
  hasAccepted: boolean;
  isLoading: boolean;
  acceptTerms: () => Promise<{ success: boolean; error?: string }>;
}

export function useTermsAcceptance(): TermsAcceptance {
  const { user, isAdmin, accountId } = useAuth();
  const [hasAccepted, setHasAccepted] = useState(true); // Default to true to avoid flash
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAcceptance() {
      if (!user || !isAdmin) {
        setHasAccepted(true);
        setIsLoading(false);
        return;
      }

      try {
        // Query by user_id directly - RLS now allows this
        const { data, error } = await supabase
          .from('terms_acceptance')
          .select('id')
          .eq('user_id', user.id)
          .eq('terms_version', CURRENT_TERMS_VERSION)
          .maybeSingle();

        if (error) {
          console.error('Error checking terms acceptance:', error);
          // On error, allow access but log - don't block users
          setHasAccepted(true);
        } else {
          setHasAccepted(!!data);
        }
      } catch (err) {
        console.error('Error checking terms acceptance:', err);
        setHasAccepted(true);
      } finally {
        setIsLoading(false);
      }
    }

    checkAcceptance();
  }, [user, isAdmin]);

  const acceptTerms = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      // Use the accountId from context, but allow null for first-time users
      // The RLS policy now allows insert by user_id
      const { error } = await supabase
        .from('terms_acceptance')
        .insert({
          user_id: user.id,
          account_id: accountId || null, // Can be null initially
          terms_version: CURRENT_TERMS_VERSION,
          user_agent: navigator.userAgent,
        });

      if (error) {
        // Check if it's a duplicate key error (user already accepted)
        if (error.code === '23505') {
          // Already accepted - this is fine
          setHasAccepted(true);
          return { success: true };
        }
        console.error('Error accepting terms:', error);
        return { success: false, error: 'Erro ao registrar aceite. Tente novamente.' };
      }

      setHasAccepted(true);
      return { success: true };
    } catch (err) {
      console.error('Error accepting terms:', err);
      return { success: false, error: 'Erro ao registrar aceite. Tente novamente.' };
    }
  }, [user, accountId]);

  return { hasAccepted, isLoading, acceptTerms };
}
