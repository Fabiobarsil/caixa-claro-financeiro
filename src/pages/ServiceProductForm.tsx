import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useServicesProducts, ServiceProduct, ItemType } from '@/hooks/useServicesProducts';
import { capitalizeWords } from '@/lib/inputFormatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SmartValueInput from '@/components/ui/smart-value-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { ArrowLeft, Trash2, Scissors, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ServiceProductForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  
  const { items, createItem, updateItem, deleteItem, isAdmin, isLoading: isLoadingItems } = useServicesProducts();
  
  const [type, setType] = useState<ItemType>('servico');
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load editing item data
  useEffect(() => {
    if (editId && items.length > 0) {
      const item = items.find((i) => i.id === editId);
      if (item) {
        setType(item.type);
        setName(item.name);
        setBasePrice(item.base_price.toString());
        setCost(item.cost?.toString() || '');
        setNotes(item.notes || '');
      }
    }
  }, [editId, items]);

  const handleBack = () => {
    navigate('/configuracoes/servicos');
  };

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

      if (editId) {
        await updateItem.mutateAsync({ id: editId, ...data });
      } else {
        await createItem.mutateAsync(data);
      }
      navigate('/configuracoes/servicos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    
    setIsSubmitting(true);
    try {
      await deleteItem.mutateAsync(editId);
      navigate('/configuracoes/servicos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim() && basePrice;
  const isEditing = !!editId;

  // Get dynamic title and subtitle based on type
  const getTitle = () => {
    if (isEditing) {
      return type === 'servico' ? 'Editar Serviço' : 'Editar Produto';
    }
    return type === 'servico' ? 'Novo Serviço' : 'Novo Produto';
  };

  const getSubtitle = () => {
    if (type === 'servico') {
      return 'Cadastre um serviço que poderá ser usado em lançamentos.';
    }
    return 'Cadastre um produto que poderá ser vendido ou faturado.';
  };

  if (isLoadingItems && editId) {
    return (
      <AppLayout>
        <div className="flex justify-center pb-8">
          <div className="w-full max-w-[720px] bg-card rounded-xl border border-border shadow-sm p-8">
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex justify-center pb-8">
        {/* Form Container */}
        <div className="w-full max-w-[720px] bg-card rounded-xl border border-border shadow-sm">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <h1 className="text-xl font-bold text-foreground">{getTitle()}</h1>
            <p className="text-sm text-muted-foreground mt-1">{getSubtitle()}</p>
          </div>

          {/* Form Body */}
          <div className="p-5 space-y-5">
            {/* Type Segmented Control */}
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo</Label>
              <div className="inline-flex bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setType('servico')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150',
                    type === 'servico'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Scissors size={16} />
                  Serviço
                </button>
                <button
                  onClick={() => setType('produto')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150',
                    type === 'produto'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Package size={16} />
                  Produto
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(capitalizeWords(e.target.value))}
                placeholder={type === 'servico' ? 'Ex: Consulta' : 'Ex: Whey Protein'}
                className="h-11 max-w-md"
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label htmlFor="basePrice" className="text-sm">Preço (R$) *</Label>
              <SmartValueInput
                value={basePrice}
                onChange={setBasePrice}
                placeholder="0,00"
                className="max-w-[200px]"
              />
            </div>

            {/* Cost (only for products) */}
            {type === 'produto' && (
              <div className="space-y-1.5">
                <Label htmlFor="cost" className="text-sm">Custo (R$)</Label>
                <SmartValueInput
                  value={cost}
                  onChange={setCost}
                  placeholder="0,00"
                  className="max-w-[200px]"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anotações sobre o item..."
                className="resize-none max-w-md min-h-[72px]"
                rows={2}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-border flex items-center justify-between">
            {/* Delete button (left side, only for editing) */}
            <div>
              {isEditing && isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O item "{name}" será removido permanentemente.
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
            </div>

            {/* Main actions (right side) */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                loading={isSubmitting}
                loadingText="Salvando..."
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
