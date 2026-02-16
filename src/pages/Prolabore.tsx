import { useState } from 'react';
import { Wallet, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useProlabore } from '@/hooks/useProlabore';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function Prolabore() {
  const { data, isLoading } = useProlabore();
  const [desired, setDesired] = useState('');

  const profitM = Number(data?.profit_m ?? 0);
  const recommended = Number(data?.recommended_prolabore ?? 0);
  const hasProfit = profitM > 0;

  const desiredNum = parseFloat(desired.replace(/\D/g, '')) / 100 || 0;
  const percentage = hasProfit && desiredNum > 0 ? ((desiredNum / profitM) * 100).toFixed(1) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { setDesired(''); return; }
    const num = parseInt(raw, 10) / 100;
    setDesired(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  return (
    <AppLayout showFab={false}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet size={22} className="text-primary" />
            Meu Pró-Labore
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Quanto você pode tirar este mês</p>
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className={cn(
              'rounded-2xl p-5 border shadow-sm',
              hasProfit
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/60'
                : 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-200/60'
            )}>
              <p className="text-xs font-medium text-muted-foreground mb-2">Lucro real do mês (pago)</p>
              <p className={cn('text-2xl font-bold tracking-tight', hasProfit ? 'text-emerald-600' : 'text-slate-600')}>
                {formatCurrency(profitM)}
              </p>
            </div>

            <div className={cn(
              'rounded-2xl p-5 border shadow-sm',
              'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/60'
            )}>
              <p className="text-xs font-medium text-muted-foreground mb-2">Pró-labore sugerido (40%)</p>
              <p className="text-2xl font-bold tracking-tight text-blue-600">
                {formatCurrency(recommended)}
              </p>
            </div>
          </div>
        )}

        {/* Warning banner */}
        {!isLoading && !hasProfit && (
          <Alert variant="destructive" className="border-warning/50 bg-warning/10 text-warning-foreground">
            <AlertTriangle className="h-4 w-4 !text-warning" />
            <AlertDescription className="text-sm text-foreground/80">
              Sem lucro pago no mês. Pró-labore não recomendado agora.
            </AlertDescription>
          </Alert>
        )}

        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Quanto quero tirar</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <Input
              value={desired}
              onChange={handleChange}
              placeholder="0,00"
              className="pl-9"
              inputMode="numeric"
            />
          </div>
          {hasProfit && percentage && (
            <p className="text-sm text-muted-foreground">
              Isso representa <span className="font-semibold text-foreground">{percentage}%</span> do lucro.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
