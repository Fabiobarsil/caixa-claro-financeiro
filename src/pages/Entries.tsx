import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useEntries, Entry } from '@/hooks/useEntries';
import { useEntrySchedules, getScheduleSummary, EntrySchedule } from '@/hooks/useEntrySchedules';
import { cn } from '@/lib/utils';
import { Search, Loader2, Receipt, Package, Scissors, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EntryStatusBadge from '@/components/EntryStatusBadge';
import { getEntryVisualInfo, VisualStatus } from '@/lib/entryStatus';

type FilterType = 'todos' | 'pago' | 'a_vencer' | 'vencido';

const filters: { value: FilterType; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pago', label: 'Pagos' },
  { value: 'a_vencer', label: 'A vencer' },
  { value: 'vencido', label: 'Vencidos' },
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

export default function Entries() {
  const { entries, isLoading, markAsPaid } = useEntries();
  const { schedulesByEntry, markScheduleAsPaid, isLoading: schedulesLoading } = useEntrySchedules();
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Filter by visual status
      if (activeFilter !== 'todos') {
        const { visualStatus } = getEntryVisualInfo(entry.status, entry.due_date, entry.payment_date);
        // Group 'vence_hoje' with 'a_vencer' for filtering
        const effectiveStatus = visualStatus === 'vence_hoje' ? 'a_vencer' : visualStatus;
        if (effectiveStatus !== activeFilter) return false;
      }

      // Filter by search
      const matchesSearch = search === '' || 
        (entry.client_name?.toLowerCase().includes(search.toLowerCase())) ||
        (entry.item_name?.toLowerCase().includes(search.toLowerCase()));
      
      return matchesSearch;
    });
  }, [entries, activeFilter, search]);

  const handleMarkAsPaid = (entry: Entry) => {
    markAsPaid.mutate(entry.id);
  };

  const handleMarkSchedulePaid = (scheduleId: string) => {
    markScheduleAsPaid.mutate(scheduleId);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground">Lançamentos</h1>
          <p className="text-sm text-muted-foreground">Vendas e atendimentos</p>
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

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
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
        <div className="flex-1 overflow-auto -mx-4 px-4 pb-20">
          {isLoading || schedulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt size={48} className="mb-4 opacity-50" />
              <p className="text-center">
                {search || activeFilter !== 'todos'
                  ? 'Nenhum lançamento encontrado'
                  : 'Nenhum lançamento cadastrado'}
              </p>
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
                  isMarkingPaid={markAsPaid.isPending}
                  isMarkingSchedulePaid={markScheduleAsPaid.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

interface EntryListCardProps {
  entry: Entry;
  schedules: EntrySchedule[];
  onMarkAsPaid: () => void;
  onMarkSchedulePaid: (scheduleId: string) => void;
  isMarkingPaid: boolean;
  isMarkingSchedulePaid: boolean;
}

function EntryListCard({ 
  entry, 
  schedules,
  onMarkAsPaid, 
  onMarkSchedulePaid,
  isMarkingPaid,
  isMarkingSchedulePaid 
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
              isMarking={isMarkingSchedulePaid}
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
  isMarking: boolean;
}

function ScheduleItem({ schedule, onMarkPaid, isMarking }: ScheduleItemProps) {
  const { visualStatus, label, variant } = getEntryVisualInfo(
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
          >
            <CheckCircle size={18} />
          </Button>
        )}
      </div>
    </div>
  );
}
