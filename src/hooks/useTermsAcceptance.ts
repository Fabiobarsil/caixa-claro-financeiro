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
  const { user, isAdmin } = useAuth();
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
        const { data, error } = await supabase
          .from('terms_acceptance')
          .select('id')
          .eq('user_id', user.id)
          .eq('terms_version', CURRENT_TERMS_VERSION)
          .maybeSingle();

        if (error) {
          console.error('Error checking terms acceptance:', error);
          setHasAccepted(true); // Fail open to not block users on error
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

    // Get account_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    try {
      const { error } = await supabase
        .from('terms_acceptance')
        .insert({
          user_id: user.id,
          account_id: profile?.account_id || null,
          terms_version: CURRENT_TERMS_VERSION,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Error accepting terms:', error);
        return { success: false, error: 'Erro ao registrar aceite' };
      }

      setHasAccepted(true);
      return { success: true };
    } catch (err) {
      console.error('Error accepting terms:', err);
      return { success: false, error: 'Erro ao registrar aceite' };
    }
  }, [user]);

  return { hasAccepted, isLoading, acceptTerms };
}
