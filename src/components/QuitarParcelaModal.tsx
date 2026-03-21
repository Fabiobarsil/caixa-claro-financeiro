import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Loader2, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface ParcelaItem {
  id: string;
  entry_id: string;
  installment_number: number;
  installments_total: number;
  due_date: string;
  amount: number;
  status: string;
  schedule_type: string;
  paid_at?: string | null;
}

export interface QuitarPayload {
  scheduleIds: string[];
  payment_method: string;
  amount_paid: number;
  payment_date: string;
  payment_notes: string;
}

interface QuitarParcelaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  parcelas: ParcelaItem[];
  isLoadingParcelas: boolean;
  /** For single transactions without schedules */
  singleTransactionId?: string;
  singleTransactionAmount?: number;
  onConfirmQuitar: (payload: QuitarPayload) => void;
  onConfirmEstornar?: (scheduleId: string) => void;
  isSubmitting: boolean;
  isAdmin: boolean;
}

export default function QuitarParcelaModal({
  open, onOpenChange, title, subtitle,
  parcelas, isLoadingParcelas,
  singleTransactionId, singleTransactionAmount,
  onConfirmQuitar, onConfirmEstornar,
  isSubmitting, isAdmin,
}: QuitarParcelaModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [estornarTarget, setEstornarTarget] = useState<string | null>(null);

  // Separate pending and paid
  const pendentes = parcelas.filter(p => p.status === 'pendente');
  const pagas = parcelas.filter(p => p.status === 'pago');

  const getDefaultSelectedIds = () => {
    if (pendentes.length === 0) return new Set<string>();

    const nextDueInstallment = [...pendentes].sort((a, b) => {
      if (a.installment_number !== b.installment_number) {
        return a.installment_number - b.installment_number;
      }
      return a.due_date.localeCompare(b.due_date);
    })[0];

    return new Set<string>([nextDueInstallment.id]);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      // Regra: em lançamentos parcelados, a quitação padrão deve ser individual.
      // Selecionamos apenas a próxima parcela pendente por padrão.
      setSelectedIds(getDefaultSelectedIds());
      setPaymentMethod('pix');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      setCustomAmount('');
      setEstornarTarget(null);
    }
  }, [open, parcelas]);

  const selectedTotal = pendentes
    .filter(p => selectedIds.has(p.id))
    .reduce((sum, p) => sum + p.amount, 0);

  const effectiveAmount = customAmount ? parseFloat(customAmount.replace(',', '.')) : selectedTotal;

  const toggleParcela = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (singleTransactionId && pendentes.length === 0) {
      onConfirmQuitar({
        scheduleIds: [],
        payment_method: paymentMethod,
        amount_paid: singleTransactionAmount || 0,
        payment_date: paymentDate,
        payment_notes: notes,
      });
      return;
    }

    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    onConfirmQuitar({
      scheduleIds: ids,
      payment_method: paymentMethod,
      amount_paid: effectiveAmount,
      payment_date: paymentDate,
      payment_notes: notes,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quitar Parcela</DialogTitle>
            {(title || subtitle) && (
              <DialogDescription>
                {title}{subtitle ? ` — ${subtitle}` : ''}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {isLoadingParcelas ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Pending installments */}
                {pendentes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Parcelas pendentes:</p>
                    {pendentes.map(p => (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedIds.has(p.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleParcela(p.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {p.schedule_type === 'installment' ? 'Parcela' : 'Mês'} {p.installment_number}/{p.installments_total}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Venc: {format(parseISO(p.due_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <span className="font-semibold text-sm">{formatCurrency(p.amount)}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Single transaction (no schedules) */}
                {pendentes.length === 0 && singleTransactionId && (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">
                      Confirmar pagamento de {formatCurrency(singleTransactionAmount || 0)}?
                    </p>
                  </div>
                )}

                {/* Payment details */}
                {(pendentes.length > 0 || singleTransactionId) && (
                  <div className="space-y-3 border-t border-border pt-3">
                    {pendentes.length > 0 && (
                      <>
                        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
                          <p className="text-xs font-medium text-foreground">
                            Por padrão, apenas a próxima parcela pendente é selecionada.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Marque outras parcelas somente se quiser quitar mais de uma de uma vez.
                          </p>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total selecionado:</span>
                          <span className="font-bold text-foreground">{formatCurrency(selectedTotal)}</span>
                        </div>
                      </>
                    )}

                    <div>
                      <Label htmlFor="quitar-amount" className="text-sm">Valor pago (R$)</Label>
                      <Input
                        id="quitar-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder={selectedTotal.toFixed(2)}
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-0.5">Deixe vazio para usar o valor das parcelas selecionadas</p>
                    </div>

                    <div>
                      <Label htmlFor="quitar-date" className="text-sm">Data do pagamento</Label>
                      <Input
                        id="quitar-date"
                        type="date"
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="quitar-method" className="text-sm">Forma de pagamento</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">Pix</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="quitar-notes" className="text-sm">Observação (opcional)</Label>
                      <Textarea
                        id="quitar-notes"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex: Pagamento via transferência bancária"
                        className="mt-1 resize-none min-h-[60px]"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Paid installments (with estornar option) */}
                {pagas.length > 0 && isAdmin && onConfirmEstornar && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-sm font-medium text-foreground">Parcelas pagas:</p>
                    {pagas.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-success/20 bg-success/5">
                        <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {p.schedule_type === 'installment' ? 'Parcela' : 'Mês'} {p.installment_number}/{p.installments_total}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pago em: {p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy') : '—'}
                          </p>
                        </div>
                        <span className="font-semibold text-sm text-success">{formatCurrency(p.amount)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEstornarTarget(p.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {(pendentes.length > 0 || singleTransactionId) && (
              <Button
                onClick={handleConfirm}
                disabled={(pendentes.length > 0 && selectedIds.size === 0) || isSubmitting}
                className="bg-success hover:bg-success/90 text-success-foreground"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Quitar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estornar confirmation */}
      <AlertDialog open={!!estornarTarget} onOpenChange={open => !open && setEstornarTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer quitação?</AlertDialogTitle>
            <AlertDialogDescription>
              A parcela será revertida para "pendente". Esta ação ficará registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (estornarTarget && onConfirmEstornar) {
                  onConfirmEstornar(estornarTarget);
                  setEstornarTarget(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirmar Estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
