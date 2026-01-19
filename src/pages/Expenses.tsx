import AppLayout from '@/components/AppLayout';
import { useMockData } from '@/hooks/useMockData';
import { formatCurrency, formatShortDate, getCategoryLabel } from '@/lib/formatters';
import { 
  Home, 
  Megaphone, 
  Package, 
  Car, 
  MoreHorizontal,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, typeof Home> = {
  aluguel: Home,
  anuncios: Megaphone,
  materiais: Package,
  transporte: Car,
  outros: MoreHorizontal,
};

export default function Expenses() {
  const { expenses } = useMockData();
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);

  return (
    <AppLayout showFab={false}>
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Despesas</h1>
            <p className="text-sm text-muted-foreground">Controle de gastos</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
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
        <div className="space-y-2">
          {expenses.map((expense) => {
            const Icon = categoryIcons[expense.category] || MoreHorizontal;
            
            return (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-expense/10 flex items-center justify-center text-expense">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {getCategoryLabel(expense.category)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {expense.type === 'fixa' ? 'Fixa' : 'Variável'} • {formatShortDate(expense.date)}
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
      </div>
    </AppLayout>
  );
}
