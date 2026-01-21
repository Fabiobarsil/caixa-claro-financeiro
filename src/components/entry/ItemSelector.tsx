import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ServiceProduct } from '@/hooks/useServicesProducts';

type ItemType = 'servico' | 'produto';

interface ItemSelectorProps {
  itemType: ItemType;
  setItemType: (type: ItemType) => void;
  itemId: string;
  onItemChange: (id: string) => void;
  items: ServiceProduct[];
  isLoading: boolean;
  onCreateNew: () => void;
}

export default function ItemSelector({
  itemType,
  setItemType,
  itemId,
  onItemChange,
  items,
  isLoading,
  onCreateNew,
}: ItemSelectorProps) {
  const filteredItems = items.filter(item => item.type === itemType);
  
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Item do lançamento</h3>
      
      {/* Tipo toggle */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Tipo</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setItemType('servico')}
            className={cn(
              'flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors',
              itemType === 'servico'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            Serviço
          </button>
          <button
            type="button"
            onClick={() => setItemType('produto')}
            className={cn(
              'flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors',
              itemType === 'produto'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            Produto
          </button>
        </div>
      </div>
      
      {/* Item select */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {itemType === 'servico' ? 'Serviço' : 'Produto'} *
        </Label>
        <Select value={itemId} onValueChange={onItemChange} disabled={isLoading}>
          <SelectTrigger className="h-12 bg-background">
            <SelectValue placeholder={isLoading ? "Carregando..." : `Selecione o ${itemType}`} />
          </SelectTrigger>
          <SelectContent>
            {filteredItems.length === 0 ? (
              <div className="py-3 px-3 text-sm text-muted-foreground text-center">
                Nenhum {itemType} cadastrado
              </div>
            ) : (
              filteredItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      R$ {item.base_price.toFixed(2)}
                    </span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase',
                      item.type === 'servico' 
                        ? 'bg-primary/15 text-primary' 
                        : 'bg-warning/15 text-warning'
                    )}>
                      {item.type === 'servico' ? 'Serv' : 'Prod'}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
          onClick={onCreateNew}
        >
          <Plus size={14} className="mr-1" />
          Criar novo {itemType}
        </Button>
      </div>
    </div>
  );
}
