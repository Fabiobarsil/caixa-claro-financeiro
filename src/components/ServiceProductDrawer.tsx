import { useState, useEffect } from 'react';
import { useServicesProducts, ServiceProduct, ItemType } from '@/hooks/useServicesProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceProductDrawerProps {
  open: boolean;
  onClose: () => void;
  editingItem: ServiceProduct | null;
}

export default function ServiceProductDrawer({
  open,
  onClose,
  editingItem,
}: ServiceProductDrawerProps) {
  const { createItem, updateItem, deleteItem, isAdmin } = useServicesProducts();
  
  const [type, setType] = useState<ItemType>('servico');
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when drawer opens/closes or editing item changes
  useEffect(() => {
    if (open && editingItem) {
      setType(editingItem.type);
      setName(editingItem.name);
      setBasePrice(editingItem.base_price.toString());
      setCost(editingItem.cost?.toString() || '');
      setNotes(editingItem.notes || '');
    } else if (open) {
      setType('servico');
      setName('');
      setBasePrice('');
      setCost('');
      setNotes('');
    }
  }, [open, editingItem]);

  const handleSubmit = async () => {
    if (!name.trim() || !basePrice) return;

    setIsSubmitting(true);
    try {
      const data = {
        type,
        name: name.trim(),
        base_price: parseFloat(basePrice) || 0,
        cost: parseFloat(cost) || 0,
        notes: notes.trim() || undefined,
      };

      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, ...data });
      } else {
        await createItem.mutateAsync(data);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    
    setIsSubmitting(true);
    try {
      await deleteItem.mutateAsync(editingItem.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim() && basePrice;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {editingItem ? 'Editar Item' : 'Novo Item'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          {/* Type Toggle */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setType('servico')}
                className={cn(
                  'flex-1 py-3 rounded-lg font-medium transition-colors',
                  type === 'servico'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                )}
              >
                Serviço
              </button>
              <button
                onClick={() => setType('produto')}
                className={cn(
                  'flex-1 py-3 rounded-lg font-medium transition-colors',
                  type === 'produto'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground'
                )}
              >
                Produto
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'servico' ? 'Ex: Consulta' : 'Ex: Whey Protein'}
              className="h-12 bg-card"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="basePrice">Preço (R$) *</Label>
            <Input
              id="basePrice"
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0,00"
              className="h-12 bg-card"
            />
          </div>

          {/* Cost (only for products) */}
          {type === 'produto' && (
            <div className="space-y-2">
              <Label htmlFor="cost">Custo (R$)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0,00"
                className="h-12 bg-card"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre o item..."
              className="bg-card resize-none"
              rows={3}
            />
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="w-full h-12"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>

          {editingItem && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O item "{editingItem.name}" será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button variant="ghost" onClick={onClose} className="w-full h-12">
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
