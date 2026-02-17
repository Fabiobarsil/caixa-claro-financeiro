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
      // Fetch pending entry_schedules with related transaction → client + service/product
      const { data, error } = await supabase
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
        .eq('status', 'pendente')
        .order('due_date', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // For each entry, count how many installments are already paid to detect "parcial"
      const entryIds = [...new Set(data.map(d => d.entry_id))];
      
      // Fetch paid counts per entry
      const { data: paidData } = await supabase
        .from('entry_schedules')
        .select('entry_id')
        .in('entry_id', entryIds)
        .eq('status', 'pago');

      const paidCountByEntry: Record<string, number> = {};
      paidData?.forEach(p => {
        paidCountByEntry[p.entry_id] = (paidCountByEntry[p.entry_id] || 0) + 1;
      });

      return data.map((schedule): Receivable => {
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
          totalAmount: Number(tx?.amount || schedule.amount) * 100, // convert to cents for formatCents
          paidAmount: hasPaidSiblings
            ? (paidCountByEntry[schedule.entry_id] || 0) * Number(schedule.amount) * 100
            : 0,
          dueDate: schedule.due_date,
          status,
        };
      });
    },
    enabled: !!user?.accountId,
  });
}
