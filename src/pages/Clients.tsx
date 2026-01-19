import AppLayout from '@/components/AppLayout';
import { useMockData } from '@/hooks/useMockData';
import { formatCurrency } from '@/lib/formatters';
import { Search, ChevronRight, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function Clients() {
  const { clients } = useMockData();
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
        </div>

        {/* Clients List */}
        <div className="space-y-2">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors cursor-pointer card-interactive"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.totalEntries} {client.totalEntries === 1 ? 'atendimento' : 'atendimentos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-semibold text-foreground money-display">
                    {formatCurrency(client.totalPaid)}
                  </p>
                  <p className="text-xs text-muted-foreground">total pago</p>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
