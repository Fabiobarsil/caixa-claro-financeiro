import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import EntryListItem from '@/components/EntryListItem';
import { useMockData } from '@/hooks/useMockData';
import { PaymentStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type FilterType = 'todos' | PaymentStatus;

const filters: { value: FilterType; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pago', label: 'Pagos' },
  { value: 'pendente', label: 'Pendentes' },
];

export default function Entries() {
  const { entries } = useMockData();
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [search, setSearch] = useState('');

  const filteredEntries = entries.filter((entry) => {
    const matchesFilter = activeFilter === 'todos' || entry.status === activeFilter;
    const matchesSearch = search === '' || 
      entry.clientName.toLowerCase().includes(search.toLowerCase()) ||
      entry.itemName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="mb-6">
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
        <div className="space-y-2">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <EntryListItem key={entry.id} entry={entry} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum lançamento encontrado</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
