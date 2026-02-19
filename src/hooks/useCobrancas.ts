import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Receivable {
  id: string;
  clientName: string;
  clientPhone: string;
  productName: string;
  installmentCurrent: number;
  installmentsTotal: number;
  totalAmount: number; // cents-like (raw from DB)
  paidAmount: number;
  dueDate: string; // ISO date
  status: 'em_dia' | 'atrasado' | 'parcial';
}

export function useCobrancas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cobrancas', user?.accountId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().slice(0, 10);

      // 1. Fetch overdue entry_schedules (installments)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('entry_schedules')
        .select(`
          id,
          installment_number,
          installments_total,
          due_date,
          status,
          amount,
          entry_id,
          transactions!entry_schedules_transaction_id_fkey (
            id,
            amount,
            client_id,
            description,
            clients!transactions_client_id_fkey ( name, phone ),
            services_products!transactions_service_product_id_fkey ( name )
          )
        `)
        .neq('status', 'pago')
        .order('due_date', { ascending: true });

      if (scheduleError) throw scheduleError;

      // For each entry, count how many installments are already paid to detect "parcial"
      const entryIds = [...new Set((scheduleData || []).map(d => d.entry_id))];

      const { data: paidData } = entryIds.length > 0
        ? await supabase
            .from('entry_schedules')
            .select('entry_id')
            .in('entry_id', entryIds)
            .eq('status', 'pago')
        : { data: [] };

      const paidCountByEntry: Record<string, number> = {};
      paidData?.forEach(p => {
        paidCountByEntry[p.entry_id] = (paidCountByEntry[p.entry_id] || 0) + 1;
      });

      const scheduleItems: Receivable[] = (scheduleData || []).map((schedule): Receivable => {
        const tx = schedule.transactions as any;
        const client = tx?.clients;
        const sp = tx?.services_products;
        const dueDate = new Date(schedule.due_date + 'T00:00:00');
        const isOverdue = dueDate < today;
        const hasPaidSiblings = (paidCountByEntry[schedule.entry_id] || 0) > 0;

        let status: Receivable['status'] = 'em_dia';
        if (isOverdue) status = 'atrasado';
        else if (hasPaidSiblings && schedule.installments_total > 1) status = 'parcial';

        return {
          id: schedule.id,
          clientName: client?.name || 'Cliente',
          clientPhone: (client?.phone || '').replace(/\D/g, ''),
          productName: sp?.name || tx?.description || 'Item',
          installmentCurrent: schedule.installment_number,
          installmentsTotal: schedule.installments_total,
          totalAmount: Number(tx?.amount || schedule.amount) * 100,
          paidAmount: hasPaidSiblings
            ? (paidCountByEntry[schedule.entry_id] || 0) * Number(schedule.amount) * 100
            : 0,
          dueDate: schedule.due_date,
          status,
        };
      });

      // 2. Fetch overdue single transactions (without schedules)
      // Get all transaction IDs that have schedules
      const allTransactionIds = [...new Set((scheduleData || []).map(s => s.entry_id))];

      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select(`
          id, amount, status, due_date, date, description,
          client_id,
          clients!transactions_client_id_fkey ( name, phone ),
          services_products!transactions_service_product_id_fkey ( name )
        `)
        .neq('status', 'pago')
        .order('due_date', { ascending: true });

      if (txError) throw txError;

      // Check which of these transactions have schedules
      const txIds = (transactionsData || []).map(t => t.id);
      const { data: schedulesForTx } = txIds.length > 0
        ? await supabase
            .from('entry_schedules')
            .select('entry_id')
            .in('entry_id', txIds)
        : { data: [] };

      const txIdsWithSchedules = new Set((schedulesForTx || []).map(s => s.entry_id));

      const singleTxItems: Receivable[] = (transactionsData || [])
        .filter(tx => !txIdsWithSchedules.has(tx.id))
        .map((tx): Receivable => {
          const client = tx.clients as any;
          const sp = tx.services_products as any;
          const dueDateStr = tx.due_date || tx.date;
          const dueDate = new Date(dueDateStr + 'T00:00:00');
          const isOverdue = dueDate < today;

          return {
            id: tx.id,
            clientName: client?.name || 'Cliente',
            clientPhone: (client?.phone || '').replace(/\D/g, ''),
            productName: sp?.name || tx.description || 'Item',
            installmentCurrent: 1,
            installmentsTotal: 1,
            totalAmount: Number(tx.amount) * 100,
            paidAmount: 0,
            dueDate: dueDateStr,
            status: isOverdue ? 'atrasado' : 'em_dia',
          };
        });

      return [...scheduleItems, ...singleTxItems];
    },
    enabled: !!user?.accountId,
    refetchInterval: 5000,
  });
}
