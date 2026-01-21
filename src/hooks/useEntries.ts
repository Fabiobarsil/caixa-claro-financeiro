import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Entry {
  id: string;
  user_id: string;
  client_id: string | null;
  service_product_id: string | null;
  quantity: number;
  value: number;
  payment_method: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';
  status: 'pendente' | 'pago';
  date: string;
  due_date: string | null;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  client_name?: string;
  item_name?: string;
  item_type?: 'servico' | 'produto';
}

export function useEntries() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['entries'],
    queryFn: async (): Promise<Entry[]> => {
      // Fetch entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false });

      if (entriesError) throw entriesError;

      // Fetch clients for names
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      // Fetch services/products for names
      const { data: items } = await supabase
        .from('services_products')
        .select('id, name, type');

      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));
      const itemMap = new Map((items || []).map(i => [i.id, { name: i.name, type: i.type }]));

      return (entriesData || []).map(entry => {
        const item = entry.service_product_id ? itemMap.get(entry.service_product_id) : null;
        return {
          ...entry,
          client_name: entry.client_id ? clientMap.get(entry.client_id) : undefined,
          item_name: item?.name,
          item_type: item?.type as 'servico' | 'produto' | undefined,
        };
      });
    },
    enabled: !!user,
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('entries')
        .update({ 
          status: 'pago',
          payment_date: today,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Marcado como pago!');
    },
    onError: (error: Error) => {
      console.error('Erro ao marcar como pago:', error);
      toast.error('Erro ao marcar como pago');
    },
  });

  const updateEntryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pago' | 'pendente' }) => {
      const updates: { status: 'pago' | 'pendente'; payment_date?: string | null } = { status };
      
      if (status === 'pago') {
        updates.payment_date = new Date().toISOString().split('T')[0];
      } else {
        updates.payment_date = null;
      }
      
      const { error } = await supabase
        .from('entries')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) throw new Error('Apenas administradores podem excluir');
      
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('Lançamento excluído!');
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir lançamento');
    },
  });

  return {
    entries,
    isLoading,
    error,
    markAsPaid,
    updateEntryStatus,
    deleteEntry,
    isAdmin,
  };
}
