import { CreditCard, Repeat, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BillingType = 'single' | 'installment' | 'monthly_package';

interface BillingTypeSelectorProps {
  value: BillingType;
  onChange: (value: BillingType) => void;
  disabled?: boolean;
}

const billingTypes = [
  {
    id: 'single' as const,
    label: 'Único',
    description: 'Pagamento à vista',
    icon: CreditCard,
  },
  {
    id: 'installment' as const,
    label: 'Parcelado',
    description: 'Dividido em parcelas',
    icon: Repeat,
  },
  {
    id: 'monthly_package' as const,
    label: 'Pacote Mensal',
    description: 'Mensalidades recorrentes',
    icon: Package,
  },
] as const;

export default function BillingTypeSelector({
  value,
  onChange,
  disabled = false,
}: BillingTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {billingTypes.map((type) => {
        const Icon = type.icon;
        const isSelected = value === type.id;
        
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon size={20} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
            <span className={cn(
              'text-xs font-medium text-center leading-tight',
              isSelected ? 'text-primary' : 'text-foreground'
            )}>
              {type.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
