import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TransactionType = 'entrada' | 'saida';
export type TransactionCategory = 'servico' | 'produto' | 'outro';

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  client_id: string | null;
  service_product_id: string | null;
  quantity: number;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  description: string | null;
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

export function useTransactions() {
  const { user, isAdmin, accountId } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['transactions', accountId],
    queryFn: async (): Promise<Transaction[]> => {
      // RLS handles filtering by account_id
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Fetch clients for names (also filtered by RLS)
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      // Fetch services/products for names (also filtered by RLS)
      const { data: items } = await supabase
        .from('services_products')
        .select('id, name, type');

      const clientMap = new Map((clients || []).map(c => [c.id, c.name]));
      const itemMap = new Map((items || []).map(i => [i.id, { name: i.name, type: i.type }]));

      return (transactionsData || []).map(transaction => {
        const item = transaction.service_product_id ? itemMap.get(transaction.service_product_id) : null;
        return {
          ...transaction,
          amount: Number(transaction.amount),
          client_name: transaction.client_id ? clientMap.get(transaction.client_id) : undefined,
          item_name: item?.name || transaction.description,
          item_type: item?.type as 'servico' | 'produto' | undefined,
        };
      });
    },
    enabled: !!user && !!accountId,
  });

  const markAsPaid = useMutation({
    mutationFn: async (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'pago',
          payment_date: today,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Marcado como pago!');
    },
    onError: (error: Error) => {
      console.error('Erro ao marcar como pago:', error);
      toast.error('Erro ao marcar como pago');
    },
  });

  const updateTransactionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pago' | 'pendente' }) => {
      const updates: { status: 'pago' | 'pendente'; payment_date?: string | null } = { status };
      
      if (status === 'pago') {
        updates.payment_date = new Date().toISOString().split('T')[0];
      } else {
        updates.payment_date = null;
      }
      
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) throw new Error('Apenas administradores podem excluir');
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Lançamento excluído!');
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir lançamento');
    },
  });

  // Get transactions by client
  const getTransactionsByClient = (clientId: string) => {
    return transactions.filter(t => t.client_id === clientId);
  };

  return {
    transactions,
    isLoading,
    error,
    markAsPaid,
    updateTransactionStatus,
    deleteTransaction,
    getTransactionsByClient,
    isAdmin,
  };
}
