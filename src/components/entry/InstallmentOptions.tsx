import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InstallmentOptionsProps {
  installmentsTotal: string;
  setInstallmentsTotal: (value: string) => void;
  intervalDays: string;
  setIntervalDays: (value: string) => void;
  firstDueDate: string;
  setFirstDueDate: (value: string) => void;
  installmentValue: number;
}

export default function InstallmentOptions({
  installmentsTotal,
  setInstallmentsTotal,
  intervalDays,
  setIntervalDays,
  firstDueDate,
  setFirstDueDate,
  installmentValue,
}: InstallmentOptionsProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nº de parcelas</Label>
          <Input
            type="number"
            min="2"
            max="12"
            value={installmentsTotal}
            onChange={(e) => setInstallmentsTotal(e.target.value)}
            className="h-11 bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Intervalo (dias)</Label>
          <Input
            type="number"
            min="7"
            max="60"
            value={intervalDays}
            onChange={(e) => setIntervalDays(e.target.value)}
            className="h-11 bg-background"
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">1ª parcela vence em</Label>
        <Input
          type="date"
          value={firstDueDate}
          onChange={(e) => setFirstDueDate(e.target.value)}
          className="h-11 bg-background"
        />
      </div>
      
      <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
        <p className="text-sm font-semibold text-primary text-center">
          {installmentsTotal}x de R$ {installmentValue.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
