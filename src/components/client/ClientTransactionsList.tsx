import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Receipt, Package, Scissors,
  ChevronDown, ChevronUp, Clock, CheckCircle, AlertTriangle, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import EntryStatusBadge from '@/components/EntryStatusBadge';
import QuitarParcelaModal, { type QuitarPayload, type ParcelaItem } from '@/components/QuitarParcelaModal';
import { useLancamentos } from '@/hooks/useLancamentos';

interface ClientTransactionsListProps {
  clientId: string;
}

interface TransactionWithSchedules {
  id: string;
  date: string;
  description: string | null;
  item_name: string | null;
  item_type: string | null;
  amount: number;
  quantity: number;
  status: string;
  payment_method: string;
  type: string;
  category: string | null;
  due_date: string | null;
  payment_date: string | null;
  schedules: ParcelaItem[];
}

export default function ClientTransactionsList({ clientId }: ClientTransactionsListProps) {
  const { user, accountId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { markSchedulesPaid, revertSchedule } = useLancamentos();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Quitar modal
  const [quitarOpen, setQuitarOpen] = useState(false);
  const [quitarTxn, setQuitarTxn] = useState<TransactionWithSchedules | null>(null);

  // Fetch ALL transactions for this client (no month filter)
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['client-transactions', clientId, accountId],
    queryFn: async (): Promise<TransactionWithSchedules[]> => {
      const { data: txns, error: txnErr } = await supabase
        .from('transactions')
        .select('id, date, description, amount, quantity, status, payment_method, type, category, due_date, payment_date, service_product_id')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (txnErr) throw txnErr;
      if (!txns || txns.length === 0) return [];

      const spIds = txns.map(t => t.service_product_id).filter(Boolean);
      let spMap: Record<string, { name: string; type: string }> = {};
      if (spIds.length > 0) {
        const { data: sps } = await supabase
          .from('services_products')
          .select('id, name, type')
          .in('id', spIds as string[]);

        if (sps) {
          spMap = Object.fromEntries(sps.map(sp => [sp.id, { name: sp.name, type: sp.type }]));
        }
      }

      // Paginado para não truncar em 1000 registros e não perder parcelas
      const txnIds = txns.map(t => t.id);
      const allSchedules: ParcelaItem[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;

      while (true) {
        const { data: page, error: schedulesError } = await supabase
          .from('entry_schedules')
          .select('id, entry_id, installment_number, installments_total, due_date, amount, status, schedule_type, paid_at')
          .in('entry_id', txnIds)
          .order('installment_number', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (schedulesError) throw schedulesError;
        if (!page || page.length === 0) break;

        allSchedules.push(...page.map(s => ({ ...s, amount: Number(s.amount) })));

        if (page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const schedulesByEntry: Record<string, ParcelaItem[]> = {};
      allSchedules.forEach(s => {
        if (!schedulesByEntry[s.entry_id]) schedulesByEntry[s.entry_id] = [];
        schedulesByEntry[s.entry_id].push(s);
      });

      return txns.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        item_name: t.service_product_id && spMap[t.service_product_id]?.name || null,
        item_type: t.service_product_id && spMap[t.service_product_id]?.type || null,
        amount: Number(t.amount),
        quantity: t.quantity,
        status: t.status,
        payment_method: t.payment_method,
        type: t.type,
        category: t.category,
        due_date: t.due_date,
        payment_date: t.payment_date,
        schedules: schedulesByEntry[t.id] || [],
      }));
    },
    enabled: !!user && !!accountId && !!clientId,
  });

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return transactions;
    if (statusFilter === 'pendente') return transactions.filter(t => {
      if (t.schedules.length > 0) return t.schedules.some(s => !isPaidStatus(s.status));
      return !isPaidStatus(t.status);
    });
    if (statusFilter === 'pago') return transactions.filter(t => {
      if (t.schedules.length > 0) return t.schedules.every(s => isPaidStatus(s.status));
      return isPaidStatus(t.status);
    });
    return transactions;
  }, [transactions, statusFilter]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.type === 'entrada') {
          acc.entradas += t.amount;
          if (t.schedules.length > 0) {
            acc.recebido += t.schedules.filter(s => isPaidStatus(s.status)).reduce((s, p) => s + p.amount, 0);
            acc.pendente += t.schedules.filter(s => !isPaidStatus(s.status)).reduce((s, p) => s + p.amount, 0);
          } else {
            if (isPaidStatus(t.status)) acc.recebido += t.amount;
            else acc.pendente += t.amount;
          }
        }
        return acc;
      },
      { entradas: 0, recebido: 0, pendente: 0 }
    );
  }, [transactions]);

  const handleOpenQuitar = (txn: TransactionWithSchedules) => {
    setQuitarTxn(txn);
    setQuitarOpen(true);
  };

  const handleConfirmQuitar = (payload: QuitarPayload) => {
    if (payload.scheduleIds.length > 0) {
      markSchedulesPaid.mutate(payload, {
        onSuccess: () => {
          setQuitarOpen(false);
          queryClient.invalidateQueries({ queryKey: ['client-transactions', clientId] });
        },
      });
    } else if (quitarTxn && quitarTxn.schedules.length === 0) {
      // Single transaction without schedules
      markTransactionPaid.mutate(
        { transactionId: quitarTxn.id, paymentDate: payload.payment_date },
        {
          onSuccess: () => {
            setQuitarOpen(false);
            queryClient.invalidateQueries({ queryKey: ['client-transactions', clientId] });
          },
        }
      );
    }
  };

  const handleEstornar = (scheduleId: string) => {
    revertSchedule.mutate(scheduleId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['client-transactions', clientId] });
        if (quitarTxn) {
          const updated = transactions.find(t => t.id === quitarTxn.id);
          if (updated) setQuitarTxn(updated);
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Receipt size={40} className="mb-3 opacity-50" />
        <p className="text-sm">Nenhum lançamento vinculado a este cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-success/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
          <p className="text-lg font-bold text-success">{formatCurrency(totals.recebido)}</p>
        </div>
        <div className="bg-warning/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Pendente</p>
          <p className="text-lg font-bold text-warning">{formatCurrency(totals.pendente)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">
          Histórico ({filtered.length} lançamentos)
        </h4>
        <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-1" />
          Filtros
        </Button>
      </div>

      {showFilters && (
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(txn => {
          const isExpanded = expandedTxn === txn.id;
          const hasSchedules = txn.schedules.length > 0;
          const paidSchedules = txn.schedules.filter(s => isPaidStatus(s.status));
          const openSchedules = txn.schedules.filter(s => !isPaidStatus(s.status));
          const paidCount = paidSchedules.length;
          const pendingCount = openSchedules.length;
          const isEntrada = txn.type === 'entrada';

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Regra de negócio: atraso somente em parcelas abertas (não pagas)
          const overdue = openSchedules.some(s => new Date(`${s.due_date}T00:00:00`) < today);

          const nextOpenSchedule = openSchedules
            .slice()
            .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

          const effectiveDueDate = hasSchedules
            ? (nextOpenSchedule?.due_date ?? null)
            : txn.due_date;

          const effectivePaymentDate = hasSchedules
            ? paidSchedules
                .filter(s => s.paid_at)
                .slice()
                .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))[0]?.paid_at ?? null
            : txn.payment_date;

          const effectiveStatus: 'pago' | 'pendente' = hasSchedules
            ? (pendingCount > 0 ? 'pendente' : 'pago')
            : (isPaidStatus(txn.status) ? 'pago' : 'pendente');

          return (
            <div key={txn.id} className="bg-card rounded-lg border border-border overflow-hidden">
              <div
                className={cn("p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/30 transition-colors", overdue && "border-l-4 border-l-destructive")}
                onClick={() => setExpandedTxn(isExpanded ? null : txn.id)}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                  txn.item_type === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
                )}>
                  {txn.item_type === 'servico' ? <Scissors size={18} /> : <Package size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {txn.item_name || txn.description || 'Item não informado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(txn.date), 'dd MMM yyyy', { locale: ptBR })}
                    {txn.quantity > 1 && ` • ${txn.quantity}x`}
                    {hasSchedules && ` • ${paidCount}/${txn.schedules.length} pagas`}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-1 shrink-0">
                  <p className={cn("font-semibold text-sm", isEntrada ? "text-foreground" : "text-destructive")}>
                    {formatCurrency(txn.amount)}
                  </p>
                  {overdue && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-destructive bg-destructive/10">
                      Atrasado
                    </span>
                  )}
                  {!overdue && (
                    <EntryStatusBadge
                      status={effectiveStatus}
                      dueDate={effectiveDueDate}
                      paymentDate={effectivePaymentDate}
                      size="sm"
                    />
                  )}
                </div>
                {hasSchedules && (
                  isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                )}
              </div>

              {/* Botão Quitar para transações SEM parcelas */}
              {!hasSchedules && effectiveStatus === 'pendente' && (
                <div className="border-t border-border px-3 py-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleOpenQuitar(txn); }}
                    className="text-xs h-7 border-success text-success hover:bg-success hover:text-success-foreground"
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Quitar
                  </Button>
                </div>
              )}

              {isExpanded && hasSchedules && (
                <div className="border-t border-border px-3 py-2 space-y-1.5 bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-muted-foreground">Timeline de Parcelas</p>
                    {pendingCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleOpenQuitar(txn); }}
                        className="text-xs h-7 border-success text-success hover:bg-success hover:text-success-foreground"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Quitar
                      </Button>
                    )}
                  </div>
                  {txn.schedules.map(s => {
                    const isPago = isPaidStatus(s.status);
                    const isOverdue = !isPago && new Date(`${s.due_date}T00:00:00`) < today;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-xs py-1">
                        <span className="text-muted-foreground w-16">
                          {s.installment_number}/{s.installments_total}
                        </span>
                        <span className="text-muted-foreground">
                          {format(parseISO(s.due_date), 'dd/MM/yyyy')}
                        </span>
                        <span className="ml-auto font-semibold">{formatCurrency(s.amount)}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          isPago ? "bg-success/10 text-success" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                        )}>
                          {isPago ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <QuitarParcelaModal
        open={quitarOpen}
        onOpenChange={setQuitarOpen}
        title={quitarTxn?.item_name || quitarTxn?.description || ''}
        parcelas={quitarTxn?.schedules || []}
        isLoadingParcelas={false}
        singleTransactionId={quitarTxn && quitarTxn.schedules.length === 0 ? quitarTxn.id : undefined}
        singleTransactionAmount={quitarTxn && quitarTxn.schedules.length === 0 ? quitarTxn.amount : undefined}
        onConfirmQuitar={handleConfirmQuitar}
        onConfirmEstornar={isAdmin ? handleEstornar : undefined}
        isSubmitting={markSchedulesPaid.isPending}
        isAdmin={isAdmin}
      />
    </div>
  );
}

function isPaidStatus(status: string | null | undefined): boolean {
  const normalized = (status || '').toLowerCase();
  return normalized === 'pago' || normalized === 'paid';
}
