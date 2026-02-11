import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useEntries, Entry } from '@/hooks/useEntries';
import { useEntrySchedules, getScheduleSummary, EntrySchedule } from '@/hooks/useEntrySchedules';
import { useFinancialSnapshot, type MonthPeriod } from '@/hooks/useFinancialSnapshot';
import MonthSelector from '@/components/dashboard/TimeWindowSelector';
import { cn } from '@/lib/utils';
import { Search, Loader2, Receipt, Package, Scissors, CheckCircle, ChevronDown, ChevronUp, Plus, DollarSign, RotateCcw, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EntryStatusBadge from '@/components/EntryStatusBadge';
import { getEntryVisualInfo } from '@/lib/entryStatus';
import { formatCurrency } from '@/lib/formatters';

type FilterType = 'todos' | 'pago' | 'a_vencer' | 'vencido' | 'pendente_geral';

const filters: { value: FilterType; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pago', label: 'Pagos' },
  { value: 'a_vencer', label: 'A vencer' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'pendente_geral', label: 'Pendentes (Geral)' },
];

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão Crédito',
    cartao_debito: 'Cartão Débito',
  };
  return methods[method] || method;
}

// Unified item for display (can be entry or paid schedule)
interface DisplayItem {
  type: 'entry' | 'paid_schedule';
  id: string;
  clientName: string;
  itemName: string;
  itemType: 'servico' | 'produto';
  value: number;
  date: string;
  paymentDate: string | null;
  paymentMethod?: string;
  quantity?: number;
  // For schedules
  scheduleType?: 'installment' | 'monthly_package' | 'single';
  installmentNumber?: number;
  installmentsTotal?: number;
  // Original entry for actions
  entry?: Entry;
  schedule?: EntrySchedule;
}

export default function Entries() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { entries, isLoading, markAsPaid } = useEntries();
  const { 
    schedulesByEntry, 
    allSchedules, 
    markScheduleAsPaid, 
    revertScheduleToPending,
    isLoading: schedulesLoading,
    isAdmin,
  } = useEntrySchedules();
  
  // Month period for financial KPIs (persisted in localStorage)
  const [monthPeriod, setMonthPeriod] = useState<MonthPeriod>(() => {
    try {
      const saved = localStorage.getItem('entries_month_period');
      if (saved) return JSON.parse(saved);
    } catch {}
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  
  const handleMonthChange = (mp: MonthPeriod) => {
    setMonthPeriod(mp);
    localStorage.setItem('entries_month_period', JSON.stringify(mp));
  };
  
  // Financial snapshot from backend (same source as Dashboard)
  const { snapshot, isLoading: snapshotLoading } = useFinancialSnapshot(monthPeriod);
  
  // Read initial filter from URL params
  const initialFilter = (searchParams.get('status') as FilterType) || 'todos';
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    ['todos', 'pago', 'a_vencer', 'vencido', 'pendente_geral'].includes(initialFilter) ? initialFilter : 'todos'
  );
  const [search, setSearch] = useState('');

  // Update URL when filter changes
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter === 'todos') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', filter);
    }
    setSearchParams(searchParams);
  };

  // Check modes
  const isGlobalPendingMode = activeFilter === 'pendente_geral';
  const isPaidMode = activeFilter === 'pago';

  // Build entry info map for schedules display
  const entryInfoMap = useMemo(() => {
    const map = new Map<string, { 
      clientName?: string; 
      itemName?: string; 
      itemType?: 'servico' | 'produto';
      paymentMethod?: string;
      entry?: Entry;
    }>();
    entries.forEach(e => {
      map.set(e.id, {
        clientName: e.client_name,
        itemName: e.item_name,
        itemType: e.item_type,
        paymentMethod: e.payment_method,
        entry: e,
      });
    });
    return map;
  }, [entries]);

  // Set of entry IDs that have schedules
  const entryIdsWithSchedules = useMemo(() => {
    return new Set(allSchedules.map(s => s.entry_id));
  }, [allSchedules]);

  // For "Pagos" filter: combine entries without schedules that are paid + paid schedules
  const paidDisplayItems = useMemo((): DisplayItem[] => {
    if (!isPaidMode) return [];

    const items: DisplayItem[] = [];

    // 1. Entries without schedules that are paid
    entries
      .filter(e => !entryIdsWithSchedules.has(e.id) && e.status === 'pago')
      .forEach(e => {
        items.push({
          type: 'entry',
          id: e.id,
          clientName: e.client_name || 'Cliente não informado',
          itemName: e.item_name || 'Item não informado',
          itemType: e.item_type || 'servico',
          value: e.value,
          date: e.date,
          paymentDate: e.payment_date,
          paymentMethod: e.payment_method,
          quantity: e.quantity,
          entry: e,
        });
      });

    // 2. Paid schedules
    allSchedules
      .filter(s => s.status === 'pago')
      .forEach(s => {
        const entryInfo = entryInfoMap.get(s.entry_id);
        items.push({
          type: 'paid_schedule',
          id: s.id,
          clientName: entryInfo?.clientName || 'Cliente não informado',
          itemName: entryInfo?.itemName || 'Item não informado',
          itemType: entryInfo?.itemType || 'servico',
          value: s.amount,
          date: s.due_date,
          paymentDate: s.paid_at?.split('T')[0] || null,
          paymentMethod: entryInfo?.paymentMethod,
          scheduleType: s.schedule_type as 'installment' | 'monthly_package' | 'single',
          installmentNumber: s.installment_number,
          installmentsTotal: s.installments_total,
          schedule: s,
        });
      });

    // Sort by payment date descending
    return items.sort((a, b) => {
      const dateA = a.paymentDate || a.date;
      const dateB = b.paymentDate || b.date;
      return dateB.localeCompare(dateA);
    });
  }, [isPaidMode, entries, allSchedules, entryIdsWithSchedules, entryInfoMap]);

  // Filter paidDisplayItems by search
  const filteredPaidItems = useMemo(() => {
    if (!isPaidMode) return [];
    
    return paidDisplayItems.filter(item => {
      if (search === '') return true;
      return (
        item.clientName.toLowerCase().includes(search.toLowerCase()) ||
        item.itemName.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [paidDisplayItems, search, isPaidMode]);

  const filteredEntries = useMemo(() => {
    if (isGlobalPendingMode || isPaidMode) return [];

    return entries.filter((entry) => {
      if (activeFilter !== 'todos') {
        const { visualStatus } = getEntryVisualInfo(entry.status, entry.due_date, entry.payment_date);
        const effectiveStatus = visualStatus === 'vence_hoje' ? 'a_vencer' : visualStatus;
        if (effectiveStatus !== activeFilter) return false;
      }

      const matchesSearch = search === '' || 
        (entry.client_name?.toLowerCase().includes(search.toLowerCase())) ||
        (entry.item_name?.toLowerCase().includes(search.toLowerCase()));
      
      return matchesSearch;
    });
  }, [entries, activeFilter, search, isGlobalPendingMode, isPaidMode]);

  const globalPendingSchedules = useMemo(() => {
    if (!isGlobalPendingMode) return [];

    return allSchedules
      .filter(s => s.status === 'pendente')
      .filter(s => {
        if (search === '') return true;
        const entryInfo = entryInfoMap.get(s.entry_id);
        return (
          entryInfo?.clientName?.toLowerCase().includes(search.toLowerCase()) ||
          entryInfo?.itemName?.toLowerCase().includes(search.toLowerCase())
        );
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [allSchedules, isGlobalPendingMode, search, entryInfoMap]);

  const handleMarkAsPaid = (entry: Entry) => {
    markAsPaid.mutate(entry.id);
  };

  const handleMarkSchedulePaid = (scheduleId: string) => {
    markScheduleAsPaid.mutate(scheduleId);
  };

  const handleRevertSchedule = (scheduleId: string) => {
    revertScheduleToPending.mutate(scheduleId);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header with time window selector */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Lançamentos</h1>
            <p className="text-sm text-muted-foreground">
              {isGlobalPendingMode ? 'Todas as parcelas pendentes' : isPaidMode ? 'Pagamentos recebidos' : 'Vendas e atendimentos'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector value={monthPeriod} onChange={handleMonthChange} />
            <Button 
              onClick={() => navigate('/lancamentos/novo')}
              className="hidden lg:flex"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Button>
          </div>
        </div>

        {/* Financial KPI Cards - same data source as Dashboard */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-success/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Recebido</p>
            </div>
            <p className="text-lg font-bold text-success">
              {snapshotLoading ? '...' : formatCurrency(snapshot.recebido)}
            </p>
          </div>
          <div className="bg-warning/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning" />
              <p className="text-xs text-muted-foreground">A Receber</p>
            </div>
            <p className="text-lg font-bold text-warning">
              {snapshotLoading ? '...' : formatCurrency(snapshot.a_receber)}
            </p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Despesas</p>
            </div>
            <p className="text-lg font-bold text-destructive">
              {snapshotLoading ? '...' : formatCurrency(snapshot.despesas_pagas)}
            </p>
          </div>
          <div className="bg-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Lucro</p>
            </div>
            <p className={cn(
              "text-lg font-bold",
              snapshot.lucro_real >= 0 ? "text-success" : "text-destructive"
            )}>
              {snapshotLoading ? '...' : formatCurrency(snapshot.lucro_real)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            type="text"
            placeholder="Buscar cliente ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange(filter.value)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeFilter === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-auto -mx-4 px-4 pb-36">
          {isLoading || schedulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isPaidMode ? (
            /* Paid Items View (entries + schedules) */
            filteredPaidItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt size={48} className="mb-4 opacity-50" />
                <p className="text-center">Nenhum pagamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPaidItems.map((item) => (
                  <PaidItemCard 
                    key={item.id} 
                    item={item} 
                    isAdmin={isAdmin}
                    onRevert={item.schedule ? () => handleRevertSchedule(item.schedule!.id) : undefined}
                    isReverting={revertScheduleToPending.isPending}
                  />
                ))}
              </div>
            )
          ) : isGlobalPendingMode ? (
            /* Global Pending Schedules View */
            globalPendingSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Receipt size={48} className="mb-4 opacity-50" />
                <p className="text-center">Nenhuma parcela pendente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {globalPendingSchedules.map((schedule) => {
                  const entryInfo = entryInfoMap.get(schedule.entry_id);
                  return (
                    <GlobalScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      clientName={entryInfo?.clientName}
                      itemName={entryInfo?.itemName}
                      itemType={entryInfo?.itemType}
                      onMarkPaid={() => handleMarkSchedulePaid(schedule.id)}
                      isMarking={markScheduleAsPaid.isPending}
                    />
                  );
                })}
              </div>
            )
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt size={48} className="mb-4 opacity-50" />
              <p className="text-center font-medium text-foreground">
                {search || activeFilter !== 'todos'
                  ? 'Nenhum lançamento encontrado'
                  : 'Ainda não há lançamentos registrados.'}
              </p>
              {!search && activeFilter === 'todos' && (
                <>
                  <p className="text-sm text-center mt-1 max-w-xs">
                    Registre serviços prestados, produtos vendidos ou parcelas a receber.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/lancamentos/novo')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeiro lançamento
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <EntryListCard 
                  key={entry.id} 
                  entry={entry}
                  schedules={schedulesByEntry[entry.id] || []}
                  onMarkAsPaid={() => handleMarkAsPaid(entry)}
                  onMarkSchedulePaid={handleMarkSchedulePaid}
                  onRevertSchedule={handleRevertSchedule}
                  isMarkingPaid={markAsPaid.isPending}
                  isMarkingSchedulePaid={markScheduleAsPaid.isPending}
                  isRevertingSchedule={revertScheduleToPending.isPending}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

// Card for paid items (entries or schedules)
interface PaidItemCardProps {
  item: DisplayItem;
  isAdmin: boolean;
  onRevert?: () => void;
  isReverting?: boolean;
}

function PaidItemCard({ item, isAdmin, onRevert, isReverting }: PaidItemCardProps) {
  const isSchedule = item.type === 'paid_schedule';
  const typeLabel = isSchedule 
    ? (item.scheduleType === 'installment' ? 'Parcela' : 'Mês') 
    : null;

  return (
    <div className="bg-card rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          item.itemType === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
        )}>
          {item.itemType === 'servico' ? <Scissors size={20} /> : <Package size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {item.clientName}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {item.itemName}
            {isSchedule && typeLabel && ` • ${typeLabel} ${item.installmentNumber}/${item.installmentsTotal}`}
            {!isSchedule && item.quantity && item.quantity > 1 && ` (${item.quantity}x)`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {item.paymentDate 
                ? format(parseISO(item.paymentDate), "dd MMM", { locale: ptBR })
                : format(parseISO(item.date), "dd MMM", { locale: ptBR })
              }
            </span>
            {item.paymentMethod && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatPaymentMethod(item.paymentMethod)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="font-semibold text-foreground">
            R$ {item.value.toFixed(2)}
          </p>
          <span className="text-xs font-medium text-success flex items-center gap-1">
            <CheckCircle size={12} />
            Pago
          </span>
        </div>
      </div>
      
      {/* Admin only: Revert button for schedules */}
      {isAdmin && isSchedule && onRevert && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRevert}
          disabled={isReverting}
          className="w-full border-muted-foreground/30 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reverter para pendente
        </Button>
      )}
    </div>
  );
}

interface EntryListCardProps {
  entry: Entry;
  schedules: EntrySchedule[];
  onMarkAsPaid: () => void;
  onMarkSchedulePaid: (scheduleId: string) => void;
  onRevertSchedule: (scheduleId: string) => void;
  isMarkingPaid: boolean;
  isMarkingSchedulePaid: boolean;
  isRevertingSchedule: boolean;
  isAdmin: boolean;
}

function EntryListCard({ 
  entry, 
  schedules,
  onMarkAsPaid, 
  onMarkSchedulePaid,
  onRevertSchedule,
  isMarkingPaid,
  isMarkingSchedulePaid,
  isRevertingSchedule,
  isAdmin,
}: EntryListCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { visualStatus } = getEntryVisualInfo(entry.status, entry.due_date, entry.payment_date);
  const hasSchedules = schedules.length > 0;
  const scheduleSummary = hasSchedules ? getScheduleSummary(schedules) : null;
  const showMarkAsPaid = entry.status === 'pendente' && !hasSchedules;

  return (
    <div className={cn(
      "bg-card rounded-xl p-4 flex flex-col gap-3",
      visualStatus === 'vencido' && "border-l-4 border-destructive"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          entry.item_type === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
        )}>
          {entry.item_type === 'servico' ? <Scissors size={20} /> : <Package size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {entry.client_name || 'Cliente não informado'}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {entry.item_name || 'Item não informado'}
            {entry.quantity > 1 && ` (${entry.quantity}x)`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {format(parseISO(entry.date), "dd MMM", { locale: ptBR })}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatPaymentMethod(entry.payment_method)}
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="font-semibold text-foreground">
            R$ {entry.value.toFixed(2)}
          </p>
          <EntryStatusBadge 
            status={entry.status}
            dueDate={entry.due_date}
            paymentDate={entry.payment_date}
            size="sm"
          />
        </div>
      </div>

      {/* Schedule Summary */}
      {scheduleSummary && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 hover:bg-secondary transition-colors"
        >
          <span>{scheduleSummary.summary}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}

      {/* Expanded Schedules List */}
      {expanded && hasSchedules && (
        <div className="space-y-2 pt-2 border-t border-border">
          {schedules.map((schedule) => (
            <ScheduleItem
              key={schedule.id}
              schedule={schedule}
              onMarkPaid={() => onMarkSchedulePaid(schedule.id)}
              onRevert={() => onRevertSchedule(schedule.id)}
              isMarking={isMarkingSchedulePaid}
              isReverting={isRevertingSchedule}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
      
      {showMarkAsPaid && (
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkAsPaid}
          disabled={isMarkingPaid}
          className="w-full border-success text-success hover:bg-success hover:text-success-foreground"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Marcar como pago
        </Button>
      )}
    </div>
  );
}

interface ScheduleItemProps {
  schedule: EntrySchedule;
  onMarkPaid: () => void;
  onRevert: () => void;
  isMarking: boolean;
  isReverting: boolean;
  isAdmin: boolean;
}

function ScheduleItem({ schedule, onMarkPaid, onRevert, isMarking, isReverting, isAdmin }: ScheduleItemProps) {
  const { label, variant } = getEntryVisualInfo(
    schedule.status, 
    schedule.due_date, 
    schedule.paid_at?.split('T')[0] || null
  );
  const typeLabel = schedule.schedule_type === 'installment' ? 'Parcela' : 'Mês';

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {typeLabel} {schedule.installment_number}/{schedule.installments_total}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(schedule.due_date), "dd/MM/yyyy")}
        </p>
      </div>
      <div className="text-right flex items-center gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">
            R$ {schedule.amount.toFixed(2)}
          </p>
          <span className={cn(
            'text-xs font-medium',
            variant === 'success' && 'text-success',
            variant === 'warning' && 'text-warning',
            variant === 'destructive' && 'text-destructive'
          )}>
            {label}
          </span>
        </div>
        {schedule.status === 'pendente' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkPaid}
            disabled={isMarking}
            className="h-8 px-2 text-success hover:text-success hover:bg-success/10"
            title="Marcar como pago"
          >
            <CheckCircle size={18} />
          </Button>
        )}
        {/* Admin only: Revert paid schedule */}
        {schedule.status === 'pago' && isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevert}
            disabled={isReverting}
            className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Reverter para pendente"
          >
            <RotateCcw size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

interface GlobalScheduleCardProps {
  schedule: EntrySchedule;
  clientName?: string;
  itemName?: string;
  itemType?: 'servico' | 'produto';
  onMarkPaid: () => void;
  isMarking: boolean;
}

function GlobalScheduleCard({ 
  schedule, 
  clientName, 
  itemName, 
  itemType,
  onMarkPaid, 
  isMarking 
}: GlobalScheduleCardProps) {
  const { visualStatus, label, variant } = getEntryVisualInfo(
    schedule.status, 
    schedule.due_date, 
    schedule.paid_at?.split('T')[0] || null
  );
  const typeLabel = schedule.schedule_type === 'installment' ? 'Parcela' : 'Mês';

  return (
    <div className={cn(
      "bg-card rounded-xl p-4 flex flex-col gap-3",
      visualStatus === 'vencido' && "border-l-4 border-destructive"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          itemType === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
        )}>
          {itemType === 'servico' ? <Scissors size={20} /> : <Package size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {clientName || 'Cliente não informado'}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {itemName || 'Item não informado'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {typeLabel} {schedule.installment_number}/{schedule.installments_total}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              Venc: {format(parseISO(schedule.due_date), "dd/MM/yyyy")}
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="font-semibold text-foreground">
            R$ {schedule.amount.toFixed(2)}
          </p>
          <span className={cn(
            'text-xs font-medium',
            variant === 'success' && 'text-success',
            variant === 'warning' && 'text-warning',
            variant === 'destructive' && 'text-destructive'
          )}>
            {label}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onMarkPaid}
        disabled={isMarking}
        className="w-full border-success text-success hover:bg-success hover:text-success-foreground"
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Marcar como pago
      </Button>
    </div>
  );
}
