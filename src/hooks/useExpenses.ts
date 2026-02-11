import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Expense {
  id: string;
  user_id: string;
  type: 'fixa' | 'variavel';
  category: string;
  value: number;
  date: string;
  status: 'pendente' | 'pago';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  type: 'fixa' | 'variavel';
  category: string;
  value: number;
  date: string;
  status?: 'pendente' | 'pago';
  notes?: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: string;
}

export function useExpenses() {
  const { user, accountId } = useAuth();
  const queryClient = useQueryClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  const {
    data: expenses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expenses', accountId, startDate, endDate],
    queryFn: async () => {
      if (!user?.id || !accountId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar despesas:', error);
        throw error;
      }

      return (data || []) as Expense[];
    },
    enabled: !!user?.id && !!accountId,
  });

  const createExpense = useMutation({
    mutationFn: async (expenseData: CreateExpenseData) => {
      if (!user?.id || !accountId) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          account_id: accountId,
          type: expenseData.type,
          category: expenseData.category,
          value: expenseData.value,
          date: expenseData.date,
          status: expenseData.status || 'pago',
          notes: expenseData.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar despesa:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar despesa:', error);
      toast.error(`Erro ao salvar despesa: ${error.message}`);
    },
  });

  const updateExpense = useMutation({
    mutationFn: async (expenseData: UpdateExpenseData) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const { id, ...updateData } = expenseData;

      const { data, error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar despesa:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar despesa:', error);
      toast.error(`Erro ao atualizar despesa: ${error.message}`);
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: 'pago' | 'pendente' }) => {
      const newStatus = currentStatus === 'pago' ? 'pendente' : 'pago';

      const { data, error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao alternar status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      const label = data.status === 'pago' ? 'paga' : 'pendente';
      toast.success(`Despesa marcada como ${label}`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao excluir despesa:', error);
        if (error.message.includes('policy')) {
          throw new Error('Você não tem permissão para excluir despesas.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Despesa excluída com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir despesa:', error);
      toast.error(`Erro ao excluir despesa: ${error.message}`);
    },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.value), 0);
  const totalPaid = expenses.filter(e => e.status === 'pago').reduce((sum, e) => sum + Number(e.value), 0);
  const totalPending = expenses.filter(e => e.status === 'pendente').reduce((sum, e) => sum + Number(e.value), 0);

  return {
    expenses,
    totalExpenses,
    totalPaid,
    totalPending,
    isLoading,
    error,
    refetch,
    createExpense,
    updateExpense,
    toggleStatus,
    deleteExpense,
  };
}
