import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useServicesProducts, ServiceProduct, ItemType } from '@/hooks/useServicesProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Package, Scissors, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceProductListSkeleton } from '@/components/skeletons/ListSkeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ServicesProducts() {
  const navigate = useNavigate();
  const { items, isLoading, isAdmin, deleteItem } = useServicesProducts();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'servico' | 'produto'>('servico');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ServiceProduct | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = item.type === activeTab;
      return matchesSearch && matchesType;
    });
  }, [items, search, activeTab]);

  // Count by type
  const servicosCount = items.filter(i => i.type === 'servico').length;
  const produtosCount = items.filter(i => i.type === 'produto').length;

  const handleOpenNew = (type: ItemType) => {
    navigate(`/servicos-produtos/novo?type=${type}`);
  };

  const handleEdit = (item: ServiceProduct) => {
    navigate(`/servicos-produtos/novo?id=${item.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, item: ServiceProduct) => {
    e.stopPropagation();
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteItem.mutate(itemToDelete.id);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Serviços & Produtos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seu catálogo de ofertas
            </p>
          </div>
          <Button 
            onClick={() => handleOpenNew(activeTab)} 
            size="sm" 
            className="gap-1"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Novo {activeTab === 'servico' ? 'Serviço' : 'Produto'}</span>
            <span className="sm:hidden">Novo</span>
          </Button>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'servico' | 'produto')} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="servico" className="gap-2">
              <Scissors size={16} />
              Serviços
              {servicosCount > 0 && (
                <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {servicosCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="produto" className="gap-2">
              <Package size={16} />
              Produtos
              {produtosCount > 0 && (
                <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {produtosCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* List */}
          <div className="flex-1 overflow-auto -mx-4 px-4 pb-24">
            {isLoading ? (
              <ServiceProductListSkeleton count={5} />
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-fade-in">
                {activeTab === 'servico' ? (
                  <Scissors size={48} className="mb-4 opacity-50" />
                ) : (
                  <Package size={48} className="mb-4 opacity-50" />
                )}
                <p className="text-center font-medium text-foreground">
                  {search
                    ? `Nenhum ${activeTab === 'servico' ? 'serviço' : 'produto'} encontrado`
                    : `Nenhum ${activeTab === 'servico' ? 'serviço' : 'produto'} cadastrado`}
                </p>
                <p className="text-sm text-center mt-1 max-w-xs">
                  {activeTab === 'servico' 
                    ? 'Cadastre os serviços que você oferece para agilizar seus lançamentos.'
                    : 'Cadastre os produtos que você vende para controle de estoque e vendas.'}
                </p>
                {!search && (
                  <Button onClick={() => handleOpenNew(activeTab)} variant="outline" className="mt-4">
                    <Plus size={16} className="mr-2" />
                    Adicionar primeiro {activeTab === 'servico' ? 'serviço' : 'produto'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleEdit(item)}
                    className="w-full bg-card rounded-xl p-4 flex items-center gap-3 text-left border border-border hover:border-primary/30 hover:shadow-md transition-all duration-150 cursor-pointer active:scale-[0.99] active:opacity-90"
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                      item.type === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
                    )}>
                      {item.type === 'servico' ? <Scissors size={20} /> : <Package size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Valor padrão: R$ {item.base_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === 'produto' && item.stock_quantity !== null && (
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          item.stock_quantity > 0 
                            ? "bg-success/10 text-success" 
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {item.stock_quantity > 0 ? `${item.stock_quantity} em estoque` : 'Sem estoque'}
                        </span>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteClick(e, item)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {itemToDelete?.type === 'servico' ? 'serviço' : 'produto'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
