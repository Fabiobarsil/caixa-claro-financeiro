import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useEntries, Entry } from '@/hooks/useEntries';
import { cn } from '@/lib/utils';
import { Search, Loader2, Receipt, Package, Scissors } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusBadge from '@/components/StatusBadge';

type FilterType = 'todos' | 'pago' | 'pendente';

const filters: { value: FilterType; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pago', label: 'Pagos' },
  { value: 'pendente', label: 'Pendentes' },
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
  const { entries, isLoading, updateEntryStatus } = useEntries();
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [search, setSearch] = useState('');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesFilter = activeFilter === 'todos' || entry.status === activeFilter;
      const matchesSearch = search === '' || 
        (entry.client_name?.toLowerCase().includes(search.toLowerCase())) ||
        (entry.item_name?.toLowerCase().includes(search.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [entries, activeFilter, search]);

  const handleToggleStatus = async (entry: Entry) => {
    const newStatus = entry.status === 'pago' ? 'pendente' : 'pago';
    updateEntryStatus.mutate({ id: entry.id, status: newStatus });
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
        <div className="flex-1 overflow-auto -mx-4 px-4">
          {isLoading ? (
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
                <button
                  key={entry.id}
                  onClick={() => handleToggleStatus(entry)}
                  className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left hover:bg-accent transition-colors"
                >
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
                    <StatusBadge status={entry.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
