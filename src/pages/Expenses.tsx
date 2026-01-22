import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useExpenses, Expense, CreateExpenseData } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatShortDate } from '@/lib/formatters';
import { 
  Home, 
  Megaphone, 
  Package, 
  Car, 
  MoreHorizontal,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SmartValueInput from '@/components/ui/smart-value-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const categoryIcons: Record<string, typeof Home> = {
  aluguel: Home,
  anuncios: Megaphone,
  materiais: Package,
  transporte: Car,
  outros: MoreHorizontal,
};

function getCategoryIcon(category: string): typeof Home {
  const lowerCategory = category.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lowerCategory.includes(key)) {
      return icon;
    }
  }
  return MoreHorizontal;
}

interface ExpenseFormData {
  type: 'fixa' | 'variavel';
  category: string;
  value: string;
  date: string;
  notes: string;
}

const initialFormData: ExpenseFormData = {
  type: 'variavel',
  category: '',
  value: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function Expenses() {
  const { user } = useAuth();
  const { expenses, totalExpenses, isLoading, createExpense, updateExpense, deleteExpense } = useExpenses();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);

  const isAdmin = user?.role === 'admin';

  const handleOpenCreateModal = () => {
    if (!user) {
      toast.error('Faça login novamente');
      return;
    }
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    if (!user) {
      toast.error('Faça login novamente');
      return;
    }
    setSelectedExpense(expense);
    setFormData({
      type: expense.type,
      category: expense.category,
      value: expense.value.toString(),
      date: expense.date,
      notes: expense.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedExpense(null);
    setFormData(initialFormData);
  };

  const handleCreate = async () => {
    if (!formData.type || !formData.category || !formData.value) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const value = parseFloat(formData.value.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      toast.error('Valor inválido');
      return;
    }

    const expenseData: CreateExpenseData = {
      type: formData.type,
      category: formData.category,
      value,
      date: formData.date,
      notes: formData.notes || undefined,
    };

    try {
      await createExpense.mutateAsync(expenseData);
      handleCloseModals();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleUpdate = async () => {
    if (!selectedExpense) return;

    if (!formData.type || !formData.category || !formData.value) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const value = parseFloat(formData.value.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      toast.error('Valor inválido');
      return;
    }

    try {
      await updateExpense.mutateAsync({
        id: selectedExpense.id,
        type: formData.type,
        category: formData.category,
        value,
        date: formData.date,
        notes: formData.notes || undefined,
      });
      handleCloseModals();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    try {
      await deleteExpense.mutateAsync(selectedExpense.id);
      setIsDeleteDialogOpen(false);
      handleCloseModals();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout showFab={false}>
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Despesas</h1>
            <p className="text-sm text-muted-foreground">Controle de gastos</p>
          </div>
          <button 
            onClick={handleOpenCreateModal}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Total Card */}
        <div className="bg-expense-light rounded-xl p-4 border border-expense/20 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Total do mês</p>
          <p className="text-2xl font-bold text-expense money-display">
            {formatCurrency(totalExpenses)}
          </p>
        </div>

        {/* Expenses List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <MoreHorizontal className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Sem despesas registradas.
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Registrar despesas ajuda a entender seu lucro real.
            </p>
            <Button onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar despesa
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => {
              const Icon = getCategoryIcon(expense.category);
              
              return (
                <div
                  key={expense.id}
                  onClick={() => handleOpenEditModal(expense)}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-expense/10 flex items-center justify-center text-expense">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {expense.category}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {expense.type === 'fixa' ? 'Fixa' : 'Variável'} • {formatShortDate(new Date(expense.date))}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-expense money-display">
                    -{formatCurrency(expense.value)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Nova Despesa</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Registre uma despesa fixa ou variável.
            </p>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-sm">Tipo *</Label>
              <div className="inline-flex bg-secondary rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'fixa')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    formData.type === 'fixa'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Fixa
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'variavel')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    formData.type === 'variavel'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Variável
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-sm">Categoria *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Ex: Aluguel, Material, etc."
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value" className="text-sm">Valor (R$) *</Label>
              <SmartValueInput
                value={formData.value}
                onChange={(val) => handleInputChange('value', val)}
                placeholder="0,00"
                className="max-w-[180px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="h-11 max-w-[180px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações opcionais..."
                rows={2}
                className="resize-none min-h-[64px]"
              />
            </div>
          </div>

          <div className="p-5 border-t border-border flex justify-end gap-3">
            <Button variant="ghost" onClick={handleCloseModals}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createExpense.isPending}
            >
              {createExpense.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0">
          <div className="p-5 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Editar Despesa</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Atualize os dados da despesa.
            </p>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-type" className="text-sm">Tipo *</Label>
              <div className="inline-flex bg-secondary rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'fixa')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    formData.type === 'fixa'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Fixa
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('type', 'variavel')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    formData.type === 'variavel'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Variável
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-category" className="text-sm">Categoria *</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                placeholder="Ex: Aluguel, Material, etc."
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-value" className="text-sm">Valor (R$) *</Label>
              <Input
                id="edit-value"
                type="text"
                inputMode="decimal"
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="0,00"
                className="h-11 max-w-[180px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-date" className="text-sm">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="h-11 max-w-[180px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes" className="text-sm">Observações</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações opcionais..."
                rows={2}
                className="resize-none min-h-[64px]"
              />
            </div>
          </div>

          <div className="p-5 border-t border-border flex items-center justify-between">
            <div>
              {isAdmin && (
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleCloseModals}>
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateExpense.isPending}
              >
                {updateExpense.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir esta despesa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteExpense.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
