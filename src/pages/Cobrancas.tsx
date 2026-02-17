import { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, MessageCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import { useCobrancas, Receivable } from '@/hooks/useCobrancas';

// --- Helpers ---
function formatCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function daysOverdue(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

// --- Components ---
function ReceivableCard({ item }: { item: Receivable }) {
  const days = daysOverdue(item.dueDate);
  const installmentAmount = item.totalAmount / item.installmentsTotal;

  const waText = encodeURIComponent(
    `Olá ${item.clientName.split(' ')[0]}, seu pagamento de ${formatCents(installmentAmount)} referente a "${item.productName}" está vencido há ${days} ${days === 1 ? 'dia' : 'dias'}. Podemos resolver?`
  );
  const waLink = `https://wa.me/${item.clientPhone}?text=${waText}`;

  return (
    <Card className="p-4 space-y-3 border-destructive/30 bg-destructive/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{item.clientName}</p>
          <p className="text-xs text-muted-foreground truncate">{item.productName}</p>
          {item.installmentsTotal > 1 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Parcela {item.installmentCurrent}/{item.installmentsTotal}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 flex items-start gap-2">
          <div>
            <p className="text-lg font-bold text-destructive leading-tight">
              {formatCents(installmentAmount)}
            </p>
            {item.installmentsTotal > 1 && (
              <p className="text-xs text-muted-foreground">
                Total: {formatCents(item.totalAmount)}
              </p>
            )}
          </div>
          {item.clientPhone && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-[#25D366] text-white hover:bg-[#1da851] transition-colors shrink-0"
              title="Cobrar via WhatsApp"
            >
              <MessageCircle size={20} />
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-destructive/20">
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
          'bg-destructive/10 text-destructive'
        )}>
          <AlertTriangle size={12} />
          Atrasado
        </span>
        <span className="text-xs text-destructive font-medium">
          {days === 0 ? 'Vence hoje' : `Atrasado há ${days} ${days === 1 ? 'dia' : 'dias'}`}
        </span>
      </div>
    </Card>
  );
}

// --- Page ---
export default function Cobrancas() {
  const { data: receivables = [], isLoading } = useCobrancas();

  // Only show overdue items (due_date < today)
  const overdueItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return receivables.filter(r => {
      const dueDate = new Date(r.dueDate + 'T00:00:00');
      return dueDate <= today && (r.totalAmount - r.paidAmount) > 0;
    });
  }, [receivables]);

  const totalOverdue = useMemo(
    () => overdueItems.reduce((s, r) => s + (r.totalAmount / r.installmentsTotal), 0),
    [overdueItems]
  );

  const sortedItems = useMemo(
    () => [...overdueItems].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [overdueItems]
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 pb-24 lg:pb-8">
        <h1 className="text-xl font-bold text-foreground pt-4 pb-3">Cobranças em Aberto</h1>

        <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-destructive font-medium">Total Vencido</p>
              <p className="text-lg font-bold text-destructive">{formatCents(totalOverdue)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{overdueItems.length} {overdueItems.length === 1 ? 'cobrança' : 'cobranças'}</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 text-success" size={40} />
            <p className="font-medium">Nenhuma cobrança vencida!</p>
            <p className="text-sm mt-1">Todos os pagamentos estão em dia.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map(item => (
              <ReceivableCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
