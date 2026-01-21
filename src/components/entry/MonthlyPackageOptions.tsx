import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MonthlyPackageOptionsProps {
  monthsTotal: string;
  setMonthsTotal: (value: string) => void;
  firstDueDate: string;
  setFirstDueDate: (value: string) => void;
  monthlyValue: number;
}

export default function MonthlyPackageOptions({
  monthsTotal,
  setMonthsTotal,
  firstDueDate,
  setFirstDueDate,
  monthlyValue,
}: MonthlyPackageOptionsProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Duração (meses)</Label>
        <Input
          type="number"
          min="2"
          max="12"
          value={monthsTotal}
          onChange={(e) => setMonthsTotal(e.target.value)}
          className="h-11 bg-background"
        />
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">1ª mensalidade vence em</Label>
        <Input
          type="date"
          value={firstDueDate}
          onChange={(e) => setFirstDueDate(e.target.value)}
          className="h-11 bg-background"
        />
      </div>
      
      <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
        <p className="text-sm font-semibold text-primary text-center">
          {monthsTotal} meses x R$ {monthlyValue.toFixed(2)}/mês
        </p>
      </div>
    </div>
  );
}
