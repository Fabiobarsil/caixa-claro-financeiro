import { useState, useMemo } from 'react';
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
  Loader2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────

const categoryIcons: Record<string, typeof Home> = {
  aluguel: Home,
  anuncios: Megaphone,
  materiais: Package,
  transporte: Car,
  outros: MoreHorizontal,
};

function getCategoryIcon(category: string): typeof Home {
  const lc = category.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lc.includes(key)) return icon;
  }
  return MoreHorizontal;
}

type ExpenseDisplayStatus = 'pago' | 'a_vencer' | 'atrasado';

function getDisplayStatus(expense: Expense): ExpenseDisplayStatus {
  if (expense.status === 'pago') return 'pago';
  const today = new Date().toISOString().split('T')[0];
  return expense.date < today ? 'atrasado' : 'a_vencer';
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Filter type ──────────────────────────────────────────

type FilterTab = 'todas' | 'a_pagar' | 'pagas';

// ── Form types ───────────────────────────────────────────

interface ExpenseFormData {
  type: 'fixa' | 'variavel';
  category: string;
  value: string;
  date: string;
  status: 'pago' | 'pendente';
  notes: string;
}

const initialFormData: ExpenseFormData = {
  type: 'variavel',
  category: '',
  value: '',
  date: new Date().toISOString().split('T')[0],
  status: 'pago',
  notes: '',
};

// ── Status Badge Component ───────────────────────────────

function ExpenseStatusBadge({ expense }: { expense: Expense }) {
  const ds = getDisplayStatus(expense);
  
  if (ds === 'pago') {
    return (
      <Badge className="bg-success/15 text-success border-success/25 hover:bg-success/15 text-[11px] px-2 py-0.5">
        Pago
      </Badge>
    );
  }
  
  if (ds === 'atrasado') {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/15 text-[11px] px-2 py-0.5">
        Atrasado
      </Badge>
    );
  }

  const days = getDaysUntil(expense.date);
  const label = days === 0 ? 'Vence hoje' : days === 1 ? 'Vence amanhã' : `Vence em ${days}d`;

  return (
    <Badge className="bg-warning/15 text-warning border-warning/25 hover:bg-warning/15 text-[11px] px-2 py-0.5">
      {label}
    </Badge>
  );
}

// ── Main Page ────────────────────────────────────────────

export default function Expenses() {
  const { user } = useAuth();
  const { 
    expenses, totalExpenses, totalPaid, totalPending, 
    isLoading, createExpense, updateExpense, toggleStatus, deleteExpense 
  } = useExpenses();
  
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(initialFormData);

  const isAdmin = user?.role === 'admin';

  // ── Filtered list ──
  const filteredExpenses = useMemo(() => {
    if (activeTab === 'todas') return expenses;
    if (activeTab === 'pagas') return expenses.filter(e => e.status === 'pago');
    // a_pagar = pendentes (atrasadas + a vencer)
    return expenses.filter(e => e.status === 'pendente');
  }, [expenses, activeTab]);

  // ── Handlers ──
  const handleOpenCreateModal = () => {
    if (!user) { toast.error('Faça login novamente'); return; }
    setFormData(initialFormData);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    if (!user) { toast.error('Faça login novamente'); return; }
    setSelectedExpense(expense);
    setFormData({
      type: expense.type,
      category: expense.category,
      value: expense.value.toString(),
      date: expense.date,
      status: expense.status,
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

  const handleToggleStatus = (e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation();
    toggleStatus.mutate({ id: expense.id, currentStatus: expense.status });
  };

  const parseFormValue = (): number | null => {
    const value = parseFloat(formData.value.replace(',', '.'));
    if (isNaN(value) || value <= 0) { toast.error('Valor inválido'); return null; }
    return value;
  };

  const handleCreate = async () => {
    if (!formData.type || !formData.category || !formData.value) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    const value = parseFormValue();
    if (!value) return;
    try {
      await createExpense.mutateAsync({
        type: formData.type, category: formData.category,
        value, date: formData.date, status: formData.status,
        notes: formData.notes || undefined,
      });
      handleCloseModals();
    } catch {}
  };

  const handleUpdate = async () => {
    if (!selectedExpense) return;
    if (!formData.type || !formData.category || !formData.value) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    const value = parseFormValue();
    if (!value) return;
    try {
      await updateExpense.mutateAsync({
        id: selectedExpense.id, type: formData.type, category: formData.category,
        value, date: formData.date, status: formData.status,
        notes: formData.notes || undefined,
      });
      handleCloseModals();
    } catch {}
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;
    try {
      await deleteExpense.mutateAsync(selectedExpense.id);
      setIsDeleteDialogOpen(false);
      handleCloseModals();
    } catch {}
  };

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'a_pagar', label: 'A Pagar' },
    { key: 'pagas', label: 'Pagas' },
  ];

  return (
    <AppLayout showFab={false}>
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Summary Card */}
        <div className="bg-card rounded-xl border border-border mb-4">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="p-3 text-center">
              <p className="text-[11px] text-muted-foreground mb-0.5">Total</p>
              <p className="text-sm font-bold text-foreground money-display">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[11px] text-muted-foreground mb-0.5">Já Pago</p>
              <p className="text-sm font-bold text-success money-display">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[11px] text-muted-foreground mb-0.5">A Pagar</p>
              <p className="text-sm font-bold text-expense money-display">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <MoreHorizontal className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {activeTab === 'todas' ? 'Sem despesas registradas.' : 'Nenhuma despesa neste filtro.'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              Registrar despesas ajuda a entender seu lucro real.
            </p>
            {activeTab === 'todas' && (
              <Button onClick={handleOpenCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar despesa
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map((expense) => {
              const Icon = getCategoryIcon(expense.category);
              const isPago = expense.status === 'pago';
              
              return (
                <div
                  key={expense.id}
                  onClick={() => handleOpenEditModal(expense)}
                  className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  {/* Quick toggle */}
                  <button
                    onClick={(e) => handleToggleStatus(e, expense)}
                    className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                      isPago
                        ? 'text-success hover:text-success/70'
                        : 'text-muted-foreground/40 hover:text-muted-foreground'
                    )}
                    title={isPago ? 'Marcar como pendente' : 'Marcar como pago'}
                  >
                    {isPago ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  {/* Icon */}
                  <div className="w-9 h-9 rounded-full bg-expense/10 flex items-center justify-center text-expense flex-shrink-0">
                    <Icon size={18} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {expense.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {expense.type === 'fixa' ? 'Fixa' : 'Variável'} • {formatShortDate(new Date(expense.date + 'T00:00:00'))}
                    </p>
                  </div>

                  {/* Value + Badge */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="font-semibold text-sm text-expense money-display">
                      -{formatCurrency(expense.value)}
                    </p>
                    <ExpenseStatusBadge expense={expense} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0">
          <ExpenseForm
            title="Nova Despesa"
            subtitle="Registre uma despesa fixa ou variável."
            formData={formData}
            onChange={handleInputChange}
            onSubmit={handleCreate}
            onCancel={handleCloseModals}
            isPending={createExpense.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0">
          <ExpenseForm
            title="Editar Despesa"
            subtitle="Atualize os dados da despesa."
            formData={formData}
            onChange={handleInputChange}
            onSubmit={handleUpdate}
            onCancel={handleCloseModals}
            isPending={updateExpense.isPending}
            isEdit
            isAdmin={isAdmin}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
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
              {deleteExpense.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ── Extracted Form Component ─────────────────────────────

interface ExpenseFormProps {
  title: string;
  subtitle: string;
  formData: ExpenseFormData;
  onChange: (field: keyof ExpenseFormData, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  isEdit?: boolean;
  isAdmin?: boolean;
  onDelete?: () => void;
}

function ExpenseForm({ 
  title, subtitle, formData, onChange, onSubmit, onCancel, 
  isPending, isEdit, isAdmin, onDelete 
}: ExpenseFormProps) {
  return (
    <>
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      
      <div className="p-5 space-y-4">
        {/* Type */}
        <div className="space-y-1.5">
          <Label className="text-sm">Tipo *</Label>
          <div className="inline-flex bg-secondary rounded-lg p-1">
            {(['fixa', 'variavel'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => onChange('type', t)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  formData.type === t
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'fixa' ? 'Fixa' : 'Variável'}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-sm">Status *</Label>
          <div className="inline-flex bg-secondary rounded-lg p-1">
            {([
              { value: 'pago', label: 'Pago' },
              { value: 'pendente', label: 'Pendente' },
            ] as const).map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange('status', s.value)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  formData.status === s.value
                    ? s.value === 'pago'
                      ? 'bg-success text-success-foreground shadow-sm'
                      : 'bg-warning text-warning-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-sm">Categoria *</Label>
          <Input
            value={formData.category}
            onChange={(e) => onChange('category', e.target.value)}
            placeholder="Ex: Aluguel, Material, etc."
            className="h-11"
          />
        </div>

        {/* Value */}
        <div className="space-y-1.5">
          <Label className="text-sm">Valor (R$) *</Label>
          <SmartValueInput
            value={formData.value}
            onChange={(val) => onChange('value', val)}
            placeholder="0,00"
            className="max-w-[180px]"
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label className="text-sm">Data</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => onChange('date', e.target.value)}
            className="h-11 max-w-[180px]"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-sm">Observações</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            placeholder="Observações opcionais..."
            rows={2}
            className="resize-none min-h-[64px]"
          />
        </div>
      </div>

      <div className="p-5 border-t border-border flex items-center justify-between">
        <div>
          {isEdit && isAdmin && onDelete && (
            <Button 
              variant="ghost" size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              Excluir
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </div>
    </>
  );
}
