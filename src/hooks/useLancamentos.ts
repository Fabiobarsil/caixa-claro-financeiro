import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LancamentoConsolidado {
  id_master: string;
  account_id: string;
  nome_cliente: string;
  description: string | null;
  item_name: string | null;
  item_type: string | null;
  data_venda: string;
  payment_method: string | null;
  quantity: number;
  total_original: number;
  total_pago: number;
  total_pendente: number;
  total_atrasado: number;
  proximo_vencimento: string | null;
  qtd_parcelas_total: number;
  qtd_parcelas_pagas: number;
  qtd_parcelas_pendentes: number;
  status_geral: string;
  inconsistente: boolean;
}

export interface ParcelaPendente {
  id: string;
  entry_id: string;
  installment_number: number;
  installments_total: number;
  due_date: string;
  amount: number;
  status: string;
  schedule_type: string;
}

export function useLancamentos() {
  const { user, isAdmin, accountId } = useAuth();
  const queryClient = useQueryClient();

  const { data: lancamentos = [], isLoading, error } = useQuery({
    queryKey: ['lancamentos-consolidados', accountId],
    queryFn: async (): Promise<LancamentoConsolidado[]> => {
      const { data, error } = await supabase
        .from('vw_lancamentos_consolidados')
        .select('*');

      if (error) throw error;

      return (data || []).map(row => ({
        id_master: row.id_master!,
        account_id: row.account_id!,
        nome_cliente: row.nome_cliente || 'Cliente não informado',
        description: row.description,
        item_name: row.item_name,
        item_type: row.item_type,
        data_venda: row.data_venda!,
        payment_method: row.payment_method,
        quantity: row.quantity || 1,
        total_original: Number(row.total_original || 0),
        total_pago: Number(row.total_pago || 0),
        total_pendente: Number(row.total_pendente || 0),
        total_atrasado: Number(row.total_atrasado || 0),
        proximo_vencimento: row.proximo_vencimento,
        qtd_parcelas_total: row.qtd_parcelas_total || 1,
        qtd_parcelas_pagas: row.qtd_parcelas_pagas || 0,
        qtd_parcelas_pendentes: row.qtd_parcelas_pendentes || 0,
        status_geral: row.status_geral || 'PENDENTE',
        inconsistente: row.inconsistente || false,
      }));
    },
    enabled: !!user && !!accountId,
    staleTime: 0,
  });

  // Fetch pending installments for a specific transaction (for payment modal)
  const fetchParcelasPendentes = async (entryId: string): Promise<ParcelaPendente[]> => {
    const { data, error } = await supabase
      .from('entry_schedules')
      .select('id, entry_id, installment_number, installments_total, due_date, amount, status, schedule_type')
      .eq('entry_id', entryId)
      .eq('status', 'pendente')
      .order('installment_number', { ascending: true });

    if (error) throw error;
    return (data || []).map(s => ({ ...s, amount: Number(s.amount) }));
  };

  // Mark selected schedules as paid
  const markSchedulesPaid = useMutation({
    mutationFn: async (scheduleIds: string[]) => {
      const { error } = await supabase
        .from('entry_schedules')
        .update({
          status: 'pago',
          paid_at: new Date().toISOString(),
        })
        .in('id', scheduleIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-consolidados'] });
      queryClient.invalidateQueries({ queryKey: ['entry_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      toast.success('Pagamento registrado!');
    },
    onError: (error: Error) => {
      console.error('Erro ao registrar pagamento:', error);
      toast.error('Erro ao registrar pagamento');
    },
  });

  // Mark a single transaction as paid (for entries without schedules)
  const markTransactionPaid = useMutation({
    mutationFn: async (transactionId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'pago', payment_date: today })
        .eq('id', transactionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-consolidados'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['financial-snapshot'] });
      toast.success('Pagamento registrado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar pagamento');
    },
  });

  // Revert schedule to pending (admin only)
  const revertSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!isAdmin) throw new Error('Apenas administradores podem reverter');
      const { error } = await supabase
        .from('entry_schedules')
        .update({
          status: 'pendente',
          paid_at: null,
          edited_by: user?.id,
          edited_at: new Date().toISOString(),
          previous_status: 'pago',
        })
        .eq('id', scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos-consolidados'] });
      queryClient.invalidateQueries({ queryKey: ['entry_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Revertido para pendente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Categorize lancamentos into groups
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const atrasados = lancamentos.filter(l => l.status_geral === 'ATRASADO');
  const vencemEm7Dias = lancamentos.filter(l => {
    if (l.status_geral === 'PAGO' || l.status_geral === 'ATRASADO') return false;
    if (!l.proximo_vencimento) return false;
    const venc = new Date(l.proximo_vencimento + 'T00:00:00');
    return venc >= today && venc <= in7Days;
  });
  const futuros = lancamentos.filter(l => {
    if (l.status_geral === 'PAGO' || l.status_geral === 'ATRASADO') return false;
    if (!l.proximo_vencimento) return l.status_geral === 'PENDENTE';
    const venc = new Date(l.proximo_vencimento + 'T00:00:00');
    return venc > in7Days;
  });
  const pagos = lancamentos.filter(l => l.status_geral === 'PAGO');
  const inconsistentes = lancamentos.filter(l => l.inconsistente);

  return {
    lancamentos,
    atrasados,
    vencemEm7Dias,
    futuros,
    pagos,
    inconsistentes,
    isLoading,
    error,
    isAdmin,
    fetchParcelasPendentes,
    markSchedulesPaid,
    markTransactionPaid,
    revertSchedule,
  };
}
