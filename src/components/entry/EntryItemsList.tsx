import { useState, useMemo } from 'react';
import { Plus, Trash2, Package, Scissors, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SmartValueInput from '@/components/ui/smart-value-input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ServiceProduct } from '@/hooks/useServicesProducts';
import { formatCurrency } from '@/lib/formatters';

export interface EntryItem {
  id: string; // unique key for the list
  serviceProductId: string;
  name: string;
  type: 'servico' | 'produto';
  quantity: number;
  unitValue: number;
}

interface EntryItemsListProps {
  items: EntryItem[];
  onItemsChange: (items: EntryItem[]) => void;
  servicesProducts: ServiceProduct[];
  isLoading: boolean;
  onCreateNew: () => void;
  showValidation?: boolean;
}

export default function EntryItemsList({
  items,
  onItemsChange,
  servicesProducts,
  isLoading,
  onCreateNew,
  showValidation = false,
}: EntryItemsListProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate total
  const totalValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitValue), 0);
  }, [items]);

  // Filter items that are already added
  const availableItems = useMemo(() => {
    const addedIds = new Set(items.map(i => i.serviceProductId));
    return servicesProducts.filter(sp => !addedIds.has(sp.id));
  }, [servicesProducts, items]);

  // Group by type for display
  const groupedItems = useMemo(() => {
    const services = availableItems.filter(i => i.type === 'servico');
    const products = availableItems.filter(i => i.type === 'produto');
    return { services, products };
  }, [availableItems]);

  const handleAddItem = (serviceProduct: ServiceProduct) => {
    const newItem: EntryItem = {
      id: crypto.randomUUID(),
      serviceProductId: serviceProduct.id,
      name: serviceProduct.name,
      type: serviceProduct.type,
      quantity: 1,
      unitValue: serviceProduct.base_price,
    };
    onItemsChange([...items, newItem]);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<EntryItem>) => {
    onItemsChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Itens do lançamento</h3>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-muted/30 rounded-lg p-3 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    item.type === 'servico' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-warning/10 text-warning'
                  )}>
                    {item.type === 'servico' ? <Scissors size={14} /> : <Package size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === 'servico' ? 'Serviço' : 'Produto'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Qtd</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(item.id, { 
                      quantity: parseInt(e.target.value) || 1 
                    })}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Valor unit.</Label>
                  <SmartValueInput
                    value={item.unitValue.toString()}
                    onChange={(val) => handleUpdateItem(item.id, { 
                      unitValue: parseFloat(val) || 0 
                    })}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <span className="text-sm font-semibold text-foreground">
                  Subtotal: {formatCurrency(item.quantity * item.unitValue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Button */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-11 justify-start gap-2",
              showValidation && items.length === 0 && "border-destructive"
            )}
          >
            <Plus size={16} />
            <span>Adicionar item</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar serviço ou produto..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-2 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Nenhum item encontrado</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                    onClick={() => {
                      setSearchOpen(false);
                      onCreateNew();
                    }}
                  >
                    <Plus size={14} className="mr-1" />
                    Novo item
                  </Button>
                </div>
              </CommandEmpty>

              {groupedItems.services.length > 0 && (
                <CommandGroup heading="Serviços">
                  {groupedItems.services.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.name} servico`}
                      onSelect={() => handleAddItem(item)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Scissors size={14} className="text-primary" />
                      <span className="flex-1">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.base_price)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {groupedItems.products.length > 0 && (
                <CommandGroup heading="Produtos">
                  {groupedItems.products.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.name} produto`}
                      onSelect={() => handleAddItem(item)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Package size={14} className="text-warning" />
                      <span className="flex-1">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.base_price)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setSearchOpen(false);
                    onCreateNew();
                  }}
                  className="flex items-center gap-2 text-primary cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Novo item</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Total */}
      {items.length > 0 && (
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Total do lançamento</span>
            <span className="text-lg font-bold text-primary tabular-nums">
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      )}

      {items.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Adicione ao menos um item ao lançamento
        </p>
      )}
    </div>
  );
}
