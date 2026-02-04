import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingCheckResult {
  needsOnboarding: boolean;
  isLoading: boolean;
  companyName: string | null;
}

export function useOnboardingCheck(): OnboardingCheckResult {
  const { user, isAdmin } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      // Only check for admins
      if (!user?.id || !isAdmin) {
        setNeedsOnboarding(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_done, company_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding:', error);
          setNeedsOnboarding(false);
          setIsLoading(false);
          return;
        }

        // User needs onboarding if:
        // 1. Profile doesn't exist, OR
        // 2. onboarding_done is false, OR
        // 3. company_name is empty/null
        const needsIt = !profile || 
          profile.onboarding_done === false || 
          !profile.company_name?.trim();

        setNeedsOnboarding(needsIt);
        setCompanyName(profile?.company_name || null);
      } catch (error) {
        console.error('Error in onboarding check:', error);
        setNeedsOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, [user?.id, isAdmin]);

  return { needsOnboarding, isLoading, companyName };
}
