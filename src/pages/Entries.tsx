import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useLancamentos, LancamentoConsolidado, ParcelaPendente } from '@/hooks/useLancamentos';
import { useFinancialSnapshot, type MonthPeriod } from '@/hooks/useFinancialSnapshot';
import MonthSelector from '@/components/dashboard/TimeWindowSelector';
import { cn } from '@/lib/utils';
import {
  Search, Loader2, Receipt, Package, Scissors, CheckCircle,
  ChevronDown, ChevronUp, Plus, DollarSign, TrendingUp,
  TrendingDown, Clock, AlertTriangle, Pencil, RotateCcw, AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import EditTransactionDialog from '@/components/EditTransactionDialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

function formatPaymentMethod(method: string | null): string {
  if (!method) return '';
  const methods: Record<string, string> = {
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão Crédito',
    cartao_debito: 'Cartão Débito',
  };
  return methods[method] || method;
}

export default function Entries() {
  const navigate = useNavigate();
  const {
    lancamentos, atrasados, vencemEm7Dias, futuros, pagos, inconsistentes,
    isLoading, isAdmin, fetchParcelasPendentes,
    markSchedulesPaid, markTransactionPaid, revertSchedule,
  } = useLancamentos();

  const [search, setSearch] = useState('');
  const [pagosExpanded, setPagosExpanded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LancamentoConsolidado | null>(null);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<LancamentoConsolidado | null>(null);
  const [parcelas, setParcelas] = useState<ParcelaPendente[]>([]);
  const [selectedParcelas, setSelectedParcelas] = useState<Set<string>>(new Set());
  const [loadingParcelas, setLoadingParcelas] = useState(false);

  // Month period for financial KPIs
  const [monthPeriod, setMonthPeriod] = useState<MonthPeriod>(() => {
    try {
      const saved = localStorage.getItem('entries_month_period');
      if (saved) return JSON.parse(saved);
    } catch {}
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const handleMonthChange = (mp: MonthPeriod) => {
    setMonthPeriod(mp);
    localStorage.setItem('entries_month_period', JSON.stringify(mp));
  };

  const { snapshot, isLoading: snapshotLoading } = useFinancialSnapshot(monthPeriod);

  // Search filter
  const filterBySearch = (items: LancamentoConsolidado[]) => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(l =>
      l.nome_cliente.toLowerCase().includes(s) ||
      (l.item_name || '').toLowerCase().includes(s) ||
      (l.description || '').toLowerCase().includes(s)
    );
  };

  const filteredAtrasados = filterBySearch(atrasados);
  const filteredVence7 = filterBySearch(vencemEm7Dias);
  const filteredFuturos = filterBySearch(futuros);
  const filteredPagos = filterBySearch(pagos);

  // Open payment modal
  const openPaymentModal = async (lanc: LancamentoConsolidado) => {
    setPaymentTarget(lanc);
    setPaymentModalOpen(true);
    setLoadingParcelas(true);
    setSelectedParcelas(new Set());

    try {
      // If it has installments, fetch them
      if (lanc.qtd_parcelas_total > 1 || lanc.qtd_parcelas_pendentes > 0) {
        const result = await fetchParcelasPendentes(lanc.id_master);
        setParcelas(result);
        // Pre-select all
        setSelectedParcelas(new Set(result.map(p => p.id)));
      } else {
        setParcelas([]);
      }
    } catch {
      setParcelas([]);
    } finally {
      setLoadingParcelas(false);
    }
  };

  const handleConfirmPayment = () => {
    if (!paymentTarget) return;

    if (parcelas.length > 0) {
      const ids = Array.from(selectedParcelas);
      if (ids.length === 0) return;
      markSchedulesPaid.mutate(ids, {
        onSuccess: () => {
          setPaymentModalOpen(false);
          setPaymentTarget(null);
        },
      });
    } else {
      // Single transaction without schedules
      markTransactionPaid.mutate(paymentTarget.id_master, {
        onSuccess: () => {
          setPaymentModalOpen(false);
          setPaymentTarget(null);
        },
      });
    }
  };

  const toggleParcela = (id: string) => {
    setSelectedParcelas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTotal = parcelas
    .filter(p => selectedParcelas.has(p.id))
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Lançamentos</h1>
            <p className="text-sm text-muted-foreground">Vendas e atendimentos</p>
          </div>
          <div className="flex items-center gap-2">
            <MonthSelector value={monthPeriod} onChange={handleMonthChange} />
            <Button onClick={() => navigate('/lancamentos/novo')} className="hidden lg:flex">
              <Plus className="mr-2 h-4 w-4" />
              Novo
            </Button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-success/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Recebido</p>
            </div>
            <p className="text-lg font-bold text-success">
              {snapshotLoading ? '...' : formatCurrency(snapshot.recebido)}
            </p>
          </div>
          <div className="bg-warning/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning" />
              <p className="text-xs text-muted-foreground">A Receber</p>
            </div>
            <p className="text-lg font-bold text-warning">
              {snapshotLoading ? '...' : formatCurrency(snapshot.a_receber + snapshot.em_atraso)}
            </p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Despesas</p>
            </div>
            <p className="text-lg font-bold text-destructive">
              {snapshotLoading ? '...' : formatCurrency(snapshot.despesas_pagas)}
            </p>
          </div>
          <div className="bg-primary/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Lucro</p>
            </div>
            <p className={cn("text-lg font-bold", snapshot.lucro_real >= 0 ? "text-success" : "text-destructive")}>
              {snapshotLoading ? '...' : formatCurrency(snapshot.lucro_real)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            type="text"
            placeholder="Buscar cliente ou serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-card"
          />
        </div>

        {/* Cobranças Link */}
        <div className="flex gap-2 mb-4">
          <Link
            to="/cobrancas"
            className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center gap-1.5"
          >
            <AlertTriangle size={14} />
            Cobranças
          </Link>
        </div>

        {/* Inconsistency alert */}
        {inconsistentes.length > 0 && isAdmin && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Inconsistência detectada</p>
              <p className="text-xs text-muted-foreground">
                {inconsistentes.length} lançamento(s) com divergência entre total original e soma de parcelas.
              </p>
            </div>
          </div>
        )}

        {/* Entries grouped */}
        <div className="flex-1 overflow-auto -mx-4 px-4 pb-36 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : lancamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt size={48} className="mb-4 opacity-50" />
              <p className="text-center font-medium text-foreground">Ainda não há lançamentos registrados.</p>
              <p className="text-sm text-center mt-1 max-w-xs">
                Registre serviços prestados, produtos vendidos ou parcelas a receber.
              </p>
              <Button className="mt-4" onClick={() => navigate('/lancamentos/novo')}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro lançamento
              </Button>
            </div>
          ) : (
            <>
              {/* ATRASADOS */}
              <LancamentoGroup
                title="Atrasados"
                icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                items={filteredAtrasados}
                variant="destructive"
                onPayment={openPaymentModal}
                onEdit={setEditingEntry}
                isAdmin={isAdmin}
                defaultOpen
              />

              {/* VENCEM EM 7 DIAS */}
              <LancamentoGroup
                title="Vencem em 7 dias"
                icon={<Clock className="h-4 w-4 text-warning" />}
                items={filteredVence7}
                variant="warning"
                onPayment={openPaymentModal}
                onEdit={setEditingEntry}
                isAdmin={isAdmin}
                defaultOpen
              />

              {/* FUTUROS */}
              <LancamentoGroup
                title="Futuros"
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                items={filteredFuturos}
                variant="primary"
                onPayment={openPaymentModal}
                onEdit={setEditingEntry}
                isAdmin={isAdmin}
                defaultOpen
              />

              {/* PAGOS (collapsed by default) */}
              {filteredPagos.length > 0 && (
                <div>
                  <button
                    onClick={() => setPagosExpanded(!pagosExpanded)}
                    className="flex items-center gap-2 w-full mb-2"
                  >
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm font-semibold text-foreground">
                      Pagos ({filteredPagos.length})
                    </span>
                    {pagosExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {pagosExpanded && (
                    <div className="space-y-2">
                      {filteredPagos.map(lanc => (
                        <LancamentoCard
                          key={lanc.id_master}
                          lanc={lanc}
                          onPayment={openPaymentModal}
                          onEdit={setEditingEntry}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Edit Dialog */}
        <EditTransactionDialog
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          transaction={editingEntry ? {
            id: editingEntry.id_master,
            client_name: editingEntry.nome_cliente,
            item_name: editingEntry.item_name || undefined,
            description: editingEntry.description,
            amount: editingEntry.total_original,
            date: editingEntry.data_venda,
            due_date: editingEntry.proximo_vencimento,
            notes: null,
          } : null}
        />

        {/* Payment Modal */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Pagamento</DialogTitle>
              <DialogDescription>
                {paymentTarget?.nome_cliente} — {paymentTarget?.item_name || paymentTarget?.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {loadingParcelas ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : parcelas.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground">Selecione as parcelas a pagar:</p>
                  {parcelas.map(p => (
                    <label
                      key={p.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedParcelas.has(p.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <Checkbox
                        checked={selectedParcelas.has(p.id)}
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
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Total selecionado:</span>
                    <span className="font-bold text-foreground">{formatCurrency(selectedTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Confirmar pagamento de {paymentTarget ? formatCurrency(paymentTarget.total_pendente) : ''}?
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmPayment}
                disabled={parcelas.length > 0 && selectedParcelas.size === 0}
                loading={markSchedulesPaid.isPending || markTransactionPaid.isPending}
                loadingText="Salvando..."
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Group component
interface LancamentoGroupProps {
  title: string;
  icon: React.ReactNode;
  items: LancamentoConsolidado[];
  variant: 'destructive' | 'warning' | 'primary';
  onPayment: (lanc: LancamentoConsolidado) => void;
  onEdit: (lanc: LancamentoConsolidado) => void;
  isAdmin: boolean;
  defaultOpen?: boolean;
}

function LancamentoGroup({ title, icon, items, onPayment, onEdit, isAdmin, defaultOpen }: LancamentoGroupProps) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  if (items.length === 0) return null;

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full mb-2">
        {icon}
        <span className="text-sm font-semibold text-foreground">
          {title} ({items.length})
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="space-y-2">
          {items.map(lanc => (
            <LancamentoCard
              key={lanc.id_master}
              lanc={lanc}
              onPayment={onPayment}
              onEdit={onEdit}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Card component
interface LancamentoCardProps {
  lanc: LancamentoConsolidado;
  onPayment: (lanc: LancamentoConsolidado) => void;
  onEdit: (lanc: LancamentoConsolidado) => void;
  isAdmin: boolean;
}

function LancamentoCard({ lanc, onPayment, onEdit, isAdmin }: LancamentoCardProps) {
  const isPago = lanc.status_geral === 'PAGO';
  const isAtrasado = lanc.status_geral === 'ATRASADO';

  const statusBadge = (() => {
    if (isPago) return { label: 'Pago', className: 'text-success bg-success/10' };
    if (isAtrasado) return { label: 'Atrasado', className: 'text-destructive bg-destructive/10' };
    return { label: 'Pendente', className: 'text-warning bg-warning/10' };
  })();

  return (
    <div className={cn(
      "bg-card rounded-xl p-4 flex flex-col gap-3 border border-transparent",
      isAtrasado && "border-l-4 border-l-destructive",
      lanc.inconsistente && "border-destructive/50"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          lanc.item_type === 'servico' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
        )}>
          {lanc.item_type === 'servico' ? <Scissors size={20} /> : <Package size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{lanc.nome_cliente}</p>
          <p className="text-sm text-muted-foreground truncate">
            {lanc.item_name || lanc.description || 'Item não informado'}
            {lanc.quantity > 1 && ` (${lanc.quantity}x)`}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {format(parseISO(lanc.data_venda), 'dd MMM', { locale: ptBR })}
            </span>
            {lanc.payment_method && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formatPaymentMethod(lanc.payment_method)}</span>
              </>
            )}
            {lanc.qtd_parcelas_total > 1 && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {lanc.qtd_parcelas_pagas}/{lanc.qtd_parcelas_total} pagas
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1 shrink-0">
          {/* Main value: total_pendente */}
          <p className={cn("font-bold text-lg", isPago ? "text-foreground" : isAtrasado ? "text-destructive" : "text-foreground")}>
            {formatCurrency(isPago ? lanc.total_original : lanc.total_pendente)}
          </p>
          {/* Details */}
          {!isPago && lanc.total_pago > 0 && (
            <p className="text-xs text-muted-foreground">
              Pago: {formatCurrency(lanc.total_pago)}
            </p>
          )}
          {!isPago && (
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(lanc.total_original)}
            </p>
          )}
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusBadge.className)}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      {/* Next due date for pending */}
      {!isPago && lanc.proximo_vencimento && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock size={12} />
          Próx. vencimento: {format(parseISO(lanc.proximo_vencimento), 'dd/MM/yyyy')}
          {lanc.total_atrasado > 0 && (
            <span className="text-destructive font-medium ml-2">
              ({formatCurrency(lanc.total_atrasado)} em atraso)
            </span>
          )}
        </div>
      )}

      {/* Inconsistency warning */}
      {lanc.inconsistente && isAdmin && (
        <div className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle size={12} />
          Inconsistência: total ≠ pago + pendente
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(lanc)} className="text-muted-foreground hover:text-primary">
          <Pencil className="mr-1.5 h-4 w-4" />
          Editar
        </Button>
        {!isPago && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPayment(lanc)}
            className="flex-1 border-success text-success hover:bg-success hover:text-success-foreground"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Registrar Pagamento
          </Button>
        )}
      </div>
    </div>
  );
}
