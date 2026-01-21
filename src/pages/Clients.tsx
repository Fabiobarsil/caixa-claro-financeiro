import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useClients } from '@/hooks/useClients';
import { formatCurrency } from '@/lib/formatters';
import { Search, ChevronRight, User, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Clients() {
  const navigate = useNavigate();
  const { clients, isLoading } = useClients();
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateClient = () => {
    navigate('/clientes/novo');
  };

  const handleEditClient = (clientId: string) => {
    navigate(`/clientes/novo?id=${clientId}`);
  };

  return (
    <AppLayout>
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
          </div>
          
          <Button size="icon" className="rounded-full" onClick={handleCreateClient}>
            <Plus size={20} />
          </Button>
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Você ainda não cadastrou nenhum cliente.
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Clientes ajudam a organizar seus recebimentos e histórico financeiro.
            </p>
            <Button onClick={handleCreateClient}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar cliente
            </Button>
          </div>
        )}

        {/* Clients List */}
        {!isLoading && clients.length > 0 && (
          <div className="space-y-2">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                onClick={() => handleEditClient(client.id)}
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
        )}
      </div>
    </AppLayout>
  );
}
