import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import {
  FileText,
  DollarSign,
  Calendar,
  Layers,
  History,
  StickyNote,
  User,
  Tag,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDot,
  Pencil,
  Save,
  X,
  RotateCcw,
} from 'lucide-react';
import type { LancamentoConsolidado, ParcelaPendente } from '@/hooks/useLancamentos';

/* ──────────────────────────────────────────────
   Props
   ──────────────────────────────────────────── */
interface TransactionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento: LancamentoConsolidado | null;
  fetchParcelas: (entryId: string) => Promise<ParcelaPendente[]>;
  onEstornar?: (scheduleId: string) => Promise<void>;
  isAdmin?: boolean;
}

/* ──────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */
const paymentMethodLabels: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  PAGO: {
    label: 'Pago',
    className: 'bg-success/10 text-success border-success/20',
    icon: CheckCircle2,
  },
  PARCIAL: {
    label: 'Parcial',
    className: 'bg-warning/10 text-warning border-warning/20',
    icon: CircleDot,
  },
  PENDENTE: {
    label: 'Pendente',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Clock,
  },
  ATRASADO: {
    label: 'Atrasado',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertTriangle,
  },
};

function SectionHeader({ icon: Icon, title }: { icon: typeof FileText; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/* ──────────────────────────────────────────────
   Component
   ──────────────────────────────────────────── */
export default function TransactionDetailModal({
  open,
  onOpenChange,
  lancamento,
  fetchParcelas,
  onEstornar,
  isAdmin = false,
}: TransactionDetailModalProps) {
  const { user, accountId } = useAuth();
  const queryClient = useQueryClient();

  const [parcelas, setParcelas] = useState<ParcelaPendente[]>([]);
  const [loadingParcelas, setLoadingParcelas] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Editable fields
  const [editMode, setEditMode] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Estorno state
  const [estornarTarget, setEstornarTarget] = useState<ParcelaPendente | null>(null);
  const [estornando, setEstornando] = useState(false);

  // Load parcelas when modal opens
  useEffect(() => {
    if (open && lancamento) {
      setLoadingParcelas(true);
      fetchParcelas(lancamento.id_master)
        .then(setParcelas)
        .catch(() => setParcelas([]))
        .finally(() => setLoadingParcelas(false));

      // Load transaction details for notes
      supabase
        .from('transactions')
        .select('notes, description, amount, due_date')
        .eq('id', lancamento.id_master)
        .single()
        .then(({ data }) => {
          setNotes(data?.notes || '');
          setEditDescription(data?.description || lancamento.item_name || '');
          setEditAmount(String(lancamento.total_original));
          setEditDueDate(data?.due_date || '');
        });
    }

    if (!open) {
      setEditMode(false);
      setEditingNotes(false);
    }
  }, [open, lancamento]);

  /* Derived data */
  const status = lancamento?.status_geral || 'PENDENTE';
  const cfg = statusConfig[status] || statusConfig.PENDENTE;
  const StatusIcon = cfg.icon;

  const totalPago = lancamento?.total_pago || 0;
  const totalOriginal = lancamento?.total_original || 0;
  const totalPendente = lancamento?.total_pendente || 0;
  const progressPercent = totalOriginal > 0 ? Math.min(100, Math.round((totalPago / totalOriginal) * 100)) : 0;

  const isParcelado = (lancamento?.qtd_parcelas_total || 1) > 1;
  const scheduleType = useMemo(() => {
    if (parcelas.length > 0) return parcelas[0].schedule_type;
    return isParcelado ? 'installment' : 'single';
  }, [parcelas, isParcelado]);

  const originLabel = scheduleType === 'monthly_package' ? 'Recorrente' : isParcelado ? 'Parcelado' : 'Avulso';

  const paidParcelas = parcelas.filter((p) => p.status === 'pago');
  const pendingParcelas = parcelas.filter((p) => p.status === 'pendente');

  /* ── Save edit ── */
  const handleSaveEdit = async () => {
    if (!lancamento) return;
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        description: editDescription,
        amount: parsedAmount,
      };
      if (editDueDate) updates.due_date = editDueDate;

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('account_id', accountId!)
        .eq('id', lancamento.id_master);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['lancamentos-consolidados'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Lançamento atualizado!');
      setEditMode(false);
    } catch {
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  /* ── Save notes ── */
  const handleSaveNotes = async () => {
    if (!lancamento) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ notes: notes || null })
        .eq('account_id', accountId!)
        .eq('id', lancamento.id_master);

      if (error) throw error;
      toast.success('Observações salvas!');
      setEditingNotes(false);
    } catch {
      toast.error('Erro ao salvar observações');
    } finally {
      setSavingNotes(false);
    }
  };

  /* ── Handle estorno ── */
  const handleEstorno = async () => {
    if (!estornarTarget || !onEstornar) return;
    setEstornando(true);
    try {
      await onEstornar(estornarTarget.id);
      // Refresh parcelas
      if (lancamento) {
        const updated = await fetchParcelas(lancamento.id_master);
        setParcelas(updated);
      }
      setEstornarTarget(null);
    } catch {
      // error handled by the mutation
    } finally {
      setEstornando(false);
    }
  };

  if (!lancamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* ═══ HEADER ═══ */}
        <div className="bg-card border-b border-border px-6 pt-6 pb-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold text-foreground truncate">
                  {lancamento.item_name || lancamento.description || 'Lançamento'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  <User className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  {lancamento.nome_cliente}
                </DialogDescription>
              </div>
              <Badge variant="outline" className={`${cfg.className} border shrink-0 gap-1`}>
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </Badge>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-success/5 border border-success/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-success font-medium mb-0.5">Recebido</p>
                <p className="text-base font-bold text-success">{formatCurrency(totalPago)}</p>
              </div>
              <div className="rounded-lg bg-warning/5 border border-warning/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-warning font-medium mb-0.5">Pendente</p>
                <p className="text-base font-bold text-warning">{formatCurrency(totalPendente)}</p>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-primary font-medium mb-0.5">Total</p>
                <p className="text-base font-bold text-primary">{formatCurrency(totalOriginal)}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ═══ CONTENT TABS ═══ */}
        <ScrollArea className="max-h-[calc(90vh-220px)]">
          <Tabs defaultValue="details" className="w-full">
            <div className="px-6 pt-3 border-b border-border bg-card/50">
              <TabsList className="bg-transparent p-0 h-auto gap-4">
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2.5 text-xs font-medium"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Detalhes
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2.5 text-xs font-medium"
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                  Financeiro
                </TabsTrigger>
                {isParcelado && (
                  <TabsTrigger
                    value="installments"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2.5 text-xs font-medium"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1.5" />
                    Parcelas
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2.5 text-xs font-medium"
                >
                  <History className="w-3.5 h-3.5 mr-1.5" />
                  Histórico
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2.5 text-xs font-medium"
                >
                  <StickyNote className="w-3.5 h-3.5 mr-1.5" />
                  Notas
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ──── TAB: Details ──── */}
            <TabsContent value="details" className="px-6 py-4 space-y-5 mt-0">
              {/* General Info */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader icon={FileText} title="Informações Gerais" />
                  {!editMode && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditMode(true)}>
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Valor Total (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Vencimento</Label>
                        <Input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditMode(false)}>
                        <X className="w-3 h-3 mr-1" /> Cancelar
                      </Button>
                      <Button size="sm" className="h-8 text-xs" onClick={handleSaveEdit} loading={saving} loadingText="Salvando...">
                        <Save className="w-3 h-3 mr-1" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <InfoRow label="Descrição" value={lancamento.item_name || lancamento.description || '—'} />
                    <InfoRow label="Cliente" value={lancamento.nome_cliente} />
                    <InfoRow
                      label="Categoria"
                      value={
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {lancamento.item_type === 'servico' ? 'Serviço' : lancamento.item_type === 'produto' ? 'Produto' : 'Outro'}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Tipo"
                      value={
                        <span className="inline-flex items-center gap-1 text-success">
                          <ArrowDownLeft className="w-3 h-3" /> Entrada
                        </span>
                      }
                    />
                    <InfoRow label="Origem" value={originLabel} />
                    <InfoRow
                      label="Pagamento"
                      value={
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {paymentMethodLabels[lancamento.payment_method || ''] || lancamento.payment_method || '—'}
                        </span>
                      }
                    />
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <SectionHeader icon={Calendar} title="Datas" />
                <div className="space-y-0.5">
                  <InfoRow label="Data da Venda" value={formatDateBR(lancamento.data_venda)} />
                  <InfoRow label="Vencimento" value={formatDateBR(editDueDate || lancamento.proximo_vencimento)} />
                  {isParcelado && (
                    <InfoRow label="Próximo Vencimento" value={formatDateBR(lancamento.proximo_vencimento)} />
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ──── TAB: Financial ──── */}
            <TabsContent value="financial" className="px-6 py-4 space-y-5 mt-0">
              <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <SectionHeader icon={DollarSign} title="Resumo Financeiro" />

                <div className="space-y-0.5 mb-4">
                  <InfoRow label="Valor Total" value={formatCurrency(totalOriginal)} mono />
                  <InfoRow label="Valor Pago" value={<span className="text-success">{formatCurrency(totalPago)}</span>} mono />
                  <InfoRow
                    label="Valor Restante"
                    value={<span className={totalPendente > 0 ? 'text-warning' : 'text-success'}>{formatCurrency(totalPendente)}</span>}
                    mono
                  />
                  {lancamento.total_atrasado > 0 && (
                    <InfoRow
                      label="Valor em Atraso"
                      value={<span className="text-destructive">{formatCurrency(lancamento.total_atrasado)}</span>}
                      mono
                    />
                  )}
                </div>

                <Separator className="my-3" />

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso do Pagamento</span>
                    <span className="font-semibold text-foreground">{progressPercent}%</span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-2.5"
                    indicatorClassName={
                      progressPercent === 100
                        ? 'bg-success'
                        : progressPercent > 50
                        ? 'bg-primary'
                        : progressPercent > 0
                        ? 'bg-warning'
                        : 'bg-muted-foreground/20'
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {isParcelado
                      ? `${lancamento.qtd_parcelas_pagas} de ${lancamento.qtd_parcelas_total} parcelas pagas`
                      : progressPercent === 100
                      ? 'Pagamento completo'
                      : 'Pagamento pendente'}
                  </p>
                </div>
              </div>

              {/* Payment method */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <SectionHeader icon={CreditCard} title="Método de Pagamento" />
                <InfoRow
                  label="Forma de Pagamento"
                  value={paymentMethodLabels[lancamento.payment_method || ''] || lancamento.payment_method || '—'}
                />
                <InfoRow label="Quantidade" value={`${lancamento.quantity}x`} />
              </div>
            </TabsContent>

            {/* ──── TAB: Installments ──── */}
            {isParcelado && (
              <TabsContent value="installments" className="px-6 py-4 mt-0">
                <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                  <SectionHeader icon={Layers} title="Parcelas" />

                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-md bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold">
                      {lancamento.qtd_parcelas_total}x
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Valor por parcela: <span className="font-semibold text-foreground">{formatCurrency(totalOriginal / (lancamento.qtd_parcelas_total || 1))}</span>
                    </div>
                  </div>

                  {loadingParcelas ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Carregando parcelas...</div>
                  ) : parcelas.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma parcela encontrada</div>
                  ) : (
                    <div className="space-y-2">
                      {parcelas.map((p) => {
                        const isPago = p.status === 'pago';
                        const isOverdue = !isPago && new Date(p.due_date + 'T23:59:59') < new Date();
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                              isPago
                                ? 'bg-success/5 border-success/15'
                                : isOverdue
                                ? 'bg-destructive/5 border-destructive/15'
                                : 'bg-card border-border'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                  isPago
                                    ? 'bg-success/15 text-success'
                                    : isOverdue
                                    ? 'bg-destructive/15 text-destructive'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {p.installment_number}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Parcela {p.installment_number}/{p.installments_total}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Venc: {formatDateBR(p.due_date)}
                                  {isPago && p.paid_at && ` · Pago em ${formatDateBR(p.paid_at.split('T')[0])}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold font-mono text-foreground">
                                {formatCurrency(p.amount)}
                              </span>
                              {isPago ? (
                                <CheckCircle2 className="w-4 h-4 text-success" />
                              ) : isOverdue ? (
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            )}

            {/* ──── TAB: History ──── */}
            <TabsContent value="history" className="px-6 py-4 mt-0">
              <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <SectionHeader icon={History} title="Histórico de Pagamentos" />

                {paidParcelas.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum pagamento registrado ainda
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paidParcelas
                      .sort((a, b) => (a.paid_at || '').localeCompare(b.paid_at || ''))
                      .map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-success/5 border border-success/10 p-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {isParcelado ? `Parcela ${p.installment_number}` : 'Pagamento'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {p.paid_at ? formatDateBR(p.paid_at.split('T')[0]) : '—'}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold font-mono text-success">
                            +{formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Upcoming */}
                {pendingParcelas.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Próximos vencimentos</h5>
                    <div className="space-y-2">
                      {pendingParcelas
                        .sort((a, b) => a.due_date.localeCompare(b.due_date))
                        .slice(0, 5)
                        .map((p) => {
                          const isOverdue = new Date(p.due_date + 'T23:59:59') < new Date();
                          return (
                            <div key={p.id} className={`flex items-center justify-between rounded-lg border p-3 ${isOverdue ? 'bg-destructive/5 border-destructive/10' : 'bg-card border-border'}`}>
                              <div className="flex items-center gap-3">
                                {isOverdue ? (
                                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                ) : (
                                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    {isParcelado ? `Parcela ${p.installment_number}` : 'Pagamento'}
                                  </p>
                                  <p className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    Venc: {formatDateBR(p.due_date)}
                                    {isOverdue && ' · Em atraso'}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold font-mono text-foreground">
                                {formatCurrency(p.amount)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ──── TAB: Notes ──── */}
            <TabsContent value="notes" className="px-6 py-4 mt-0">
              <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader icon={StickyNote} title="Observações" />
                  {!editingNotes && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditingNotes(true)}>
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-3">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Adicionar observações sobre este lançamento..."
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditingNotes(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" className="h-8 text-xs" onClick={handleSaveNotes} loading={savingNotes} loadingText="Salvando...">
                        <Save className="w-3 h-3 mr-1" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {notes || 'Nenhuma observação adicionada.'}
                  </p>
                )}
              </div>

              {/* Tags placeholder */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)] mt-4">
                <SectionHeader icon={Tag} title="Tags" />
                <div className="flex flex-wrap gap-1.5">
                  {lancamento.item_type && (
                    <Badge variant="secondary" className="text-xs">
                      {lancamento.item_type === 'servico' ? 'Serviço' : 'Produto'}
                    </Badge>
                  )}
                  {isParcelado && (
                    <Badge variant="secondary" className="text-xs">
                      Parcelado {lancamento.qtd_parcelas_total}x
                    </Badge>
                  )}
                  <Badge variant="outline" className={cfg.className + ' text-xs border'}>
                    {cfg.label}
                  </Badge>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
