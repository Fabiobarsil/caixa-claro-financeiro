import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useServicesProducts, ServiceProduct, ItemType } from '@/hooks/useServicesProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, Scissors, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ServiceProductDrawer from '@/components/ServiceProductDrawer';

export default function ServicesProducts() {
  const navigate = useNavigate();
  const { items, isLoading, isAdmin } = useServicesProducts();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ItemType | 'todos'>('todos');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceProduct | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'todos' || item.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [items, search, filterType]);

  const handleOpenNew = () => {
    setEditingItem(null);
    setDrawerOpen(true);
  };

  const handleEdit = (item: ServiceProduct) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };

  const handleClose = () => {
    setDrawerOpen(false);
    setEditingItem(null);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Serviços e Produtos</h1>
          {isAdmin && (
            <Button onClick={handleOpenNew} size="sm" className="gap-1">
              <Plus size={18} />
              Novo
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['todos', 'servico', 'produto'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                'flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors',
                filterType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {type === 'todos' ? 'Todos' : type === 'servico' ? 'Serviços' : 'Produtos'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto -mx-4 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package size={48} className="mb-4 opacity-50" />
              <p className="text-center">
                {search || filterType !== 'todos'
                  ? 'Nenhum item encontrado'
                  : 'Nenhum serviço ou produto cadastrado'}
              </p>
              {isAdmin && !search && filterType === 'todos' && (
                <Button onClick={handleOpenNew} variant="outline" className="mt-4">
                  <Plus size={16} className="mr-2" />
                  Adicionar primeiro item
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleEdit(item)}
                  className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left hover:bg-accent transition-colors"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    item.type === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
                  )}>
                    {item.type === 'servico' ? <Scissors size={20} /> : <Package size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.type === 'servico' ? 'Serviço' : 'Produto'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      R$ {item.base_price.toFixed(2)}
                    </p>
                    {item.type === 'produto' && item.cost > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Custo: R$ {item.cost.toFixed(2)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ServiceProductDrawer
        open={drawerOpen}
        onClose={handleClose}
        editingItem={editingItem}
      />
    </AppLayout>
  );
}
