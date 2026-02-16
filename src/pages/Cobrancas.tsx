import { useState, useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, MessageCircle, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';

// --- Mock Data ---
interface Receivable {
  id: string;
  clientName: string;
  clientPhone: string;
  productName: string;
  installmentCurrent: number;
  installmentsTotal: number;
  totalAmount: number;
  paidAmount: number;
  dueDate: string; // ISO
  status: 'em_dia' | 'atrasado' | 'parcial';
}

const mockReceivables: Receivable[] = [
  {
    id: '1',
    clientName: 'Alice Mendes',
    clientPhone: '5511999001122',
    productName: 'Consulta Nutricional',
    installmentCurrent: 1,
    installmentsTotal: 2,
    totalAmount: 8800,
    paidAmount: 4400,
    dueDate: '2026-02-10',
    status: 'parcial',
  },
  {
    id: '2',
    clientName: 'Rosangela Souza',
    clientPhone: '5511988112233',
    productName: 'Pacote Mensal',
    installmentCurrent: 2,
    installmentsTotal: 3,
    totalAmount: 45000,
    paidAmount: 15000,
    dueDate: '2026-01-28',
    status: 'atrasado',
  },
  {
    id: '3',
    clientName: 'Andreia Lima',
    clientPhone: '5511977223344',
    productName: 'Avaliação Corporal',
    installmentCurrent: 1,
    installmentsTotal: 1,
    totalAmount: 12000,
    paidAmount: 0,
    dueDate: '2026-02-20',
    status: 'em_dia',
  },
  {
    id: '4',
    clientName: 'Carlos Eduardo',
    clientPhone: '5511966334455',
    productName: 'Whey Protein 1kg',
    installmentCurrent: 1,
    installmentsTotal: 1,
    totalAmount: 15000,
    paidAmount: 0,
    dueDate: '2026-01-15',
    status: 'atrasado',
  },
  {
    id: '5',
    clientName: 'Fernanda Oliveira',
    clientPhone: '5511955445566',
    productName: 'Retorno + Creatina',
    installmentCurrent: 2,
    installmentsTotal: 2,
    totalAmount: 20000,
    paidAmount: 10000,
    dueDate: '2026-02-18',
    status: 'parcial',
  },
  {
    id: '6',
    clientName: 'João Pedro',
    clientPhone: '5511944556677',
    productName: 'Consulta Nutricional',
    installmentCurrent: 1,
    installmentsTotal: 1,
    totalAmount: 18000,
    paidAmount: 0,
    dueDate: '2026-02-25',
    status: 'em_dia',
  },
];

// --- Helpers ---
function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const statusConfig = {
  atrasado: {
    label: 'Atrasado',
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive',
  },
  em_dia: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-warning/10 text-warning',
  },
  parcial: {
    label: 'Parcial',
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

// --- Components ---
function StatusBadge({ status }: { status: Receivable['status'] }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', cfg.className)}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function DueDateLabel({ dueDate, status }: { dueDate: string; status: Receivable['status'] }) {
  const days = daysUntil(dueDate);
  if (status === 'atrasado' || days < 0) {
    return <span className="text-xs text-destructive font-medium">Vencido há {Math.abs(days)} dias</span>;
  }
  if (days === 0) return <span className="text-xs text-warning font-medium">Vence hoje</span>;
  return <span className="text-xs text-muted-foreground">Vence em {days} dias</span>;
}

function ReceivableCard({ item, onMarkPaid }: { item: Receivable; onMarkPaid: (id: string) => void }) {
  const remaining = item.totalAmount - item.paidAmount;

  const waText = encodeURIComponent(
    `Olá ${item.clientName.split(' ')[0]}, seu pagamento de ${formatCents(remaining)} referente a "${item.productName}" está pendente. Podemos resolver?`
  );
  const waLink = `https://wa.me/${item.clientPhone}?text=${waText}`;

  return (
    <Card className="p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{item.clientName}</p>
          <p className="text-xs text-muted-foreground truncate">{item.productName}</p>
          {item.installmentsTotal > 1 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Parcela {item.installmentCurrent}/{item.installmentsTotal}
            </p>
          )}
        </div>

        {/* Right — amount hierarchy */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-foreground leading-tight">
            {formatCents(remaining)}
          </p>
          <p className="text-xs text-muted-foreground">
            Total: {formatCents(item.totalAmount)}
          </p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          <DueDateLabel dueDate={item.dueDate} status={item.status} />
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-[#25D366] text-white hover:bg-[#1da851] transition-colors"
            title="Cobrar via WhatsApp"
          >
            <MessageCircle size={16} />
          </a>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => onMarkPaid(item.id)}
          >
            <Check size={14} />
            Pago
          </Button>
        </div>
      </div>
    </Card>
  );
}

// --- Page ---
export default function Cobrancas() {
  const [receivables, setReceivables] = useState<Receivable[]>(mockReceivables);

  const handleMarkPaid = (id: string) => {
    setReceivables(prev =>
      prev.map(r =>
        r.id === id ? { ...r, paidAmount: r.totalAmount, status: 'em_dia' as const } : r
      )
    );
  };

  // Only show items with remaining > 0
  const openItems = useMemo(
    () => receivables.filter(r => r.totalAmount - r.paidAmount > 0),
    [receivables]
  );

  const totalRemaining = useMemo(
    () => openItems.reduce((s, r) => s + (r.totalAmount - r.paidAmount), 0),
    [openItems]
  );

  const totalOverdue = useMemo(
    () => openItems.filter(r => r.status === 'atrasado').reduce((s, r) => s + (r.totalAmount - r.paidAmount), 0),
    [openItems]
  );

  // Sort: overdue first, then by due date asc
  const sortedItems = useMemo(
    () =>
      [...openItems].sort((a, b) => {
        if (a.status === 'atrasado' && b.status !== 'atrasado') return -1;
        if (a.status !== 'atrasado' && b.status === 'atrasado') return 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }),
    [openItems]
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
        {/* Header */}
        <h1 className="text-xl font-bold text-foreground pt-4 pb-3">Cobranças em Aberto</h1>

        {/* Sticky summary */}
        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total a Receber</p>
              <p className="text-lg font-bold text-foreground">{formatCents(totalRemaining)}</p>
            </div>
            {totalOverdue > 0 && (
              <div className="text-right">
                <p className="text-xs text-destructive">Vencidos</p>
                <p className="text-lg font-bold text-destructive">{formatCents(totalOverdue)}</p>
              </div>
            )}
          </div>
        </div>

        {/* List */}
        {sortedItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 text-success" size={40} />
            <p className="font-medium">Nenhuma cobrança em aberto!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map(item => (
              <ReceivableCard key={item.id} item={item} onMarkPaid={handleMarkPaid} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
