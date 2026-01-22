import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface SmartState {
  id: string;
  type: 'alert' | 'insight';
  severity: 'attention' | 'info';
  message: string;
  generated_at: string;
}

export function useSmartState() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: smartState, isLoading } = useQuery({
    queryKey: ['smart-state', user?.id, today],
    queryFn: async (): Promise<SmartState | null> => {
      const { data, error } = await supabase
        .from('smart_states')
        .select('*')
        .eq('user_id', user!.id)
        .eq('generated_at', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching smart state:', error);
        return null;
      }

      return data as SmartState | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    smartState: smartState || null,
    isLoading,
  };
}
