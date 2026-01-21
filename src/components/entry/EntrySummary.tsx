import { Calendar, CreditCard, Repeat, Package, User, Tag } from 'lucide-react';
import { BillingType } from './BillingTypeSelector';
import { cn } from '@/lib/utils';

interface EntrySummaryProps {
  clientName?: string;
  itemName?: string;
  itemType?: 'servico' | 'produto';
  totalValue: number;
  billingType: BillingType;
  installments?: number;
  monthlyValue?: number;
  firstDueDate: string;
  status: 'pago' | 'pendente';
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getBillingLabel(type: BillingType, installments?: number): string {
  switch (type) {
    case 'installment':
      return `Parcelado ${installments}x`;
    case 'monthly_package':
      return `Pacote ${installments} meses`;
    default:
      return 'Pagamento único';
  }
}

function getBillingIcon(type: BillingType) {
  switch (type) {
    case 'installment':
      return Repeat;
    case 'monthly_package':
      return Package;
    default:
      return CreditCard;
  }
}

export default function EntrySummary({
  clientName,
  itemName,
  itemType,
  totalValue,
  billingType,
  installments,
  monthlyValue,
  firstDueDate,
  status,
}: EntrySummaryProps) {
  const BillingIcon = getBillingIcon(billingType);
  
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Resumo do lançamento</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {/* Cliente */}
        {clientName && (
          <div className="flex items-center gap-3 text-sm">
            <User size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium text-foreground ml-auto">{clientName}</span>
          </div>
        )}
        
        {/* Item */}
        {itemName && (
          <div className="flex items-center gap-3 text-sm">
            <Tag size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Item:</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-medium text-foreground">{itemName}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase',
                itemType === 'servico' 
                  ? 'bg-primary/15 text-primary' 
                  : 'bg-warning/15 text-warning'
              )}>
                {itemType === 'servico' ? 'Serviço' : 'Produto'}
              </span>
            </div>
          </div>
        )}
        
        {/* Tipo de cobrança */}
        <div className="flex items-center gap-3 text-sm">
          <BillingIcon size={16} className="text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Tipo:</span>
          <span className="font-medium text-foreground ml-auto">
            {getBillingLabel(billingType, installments)}
          </span>
        </div>
        
        {/* Primeiro vencimento */}
        {status === 'pendente' && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {billingType === 'single' ? 'Vencimento:' : '1º vencimento:'}
            </span>
            <span className="font-medium text-foreground ml-auto">
              {formatDate(firstDueDate)}
            </span>
          </div>
        )}
        
        {/* Valor parcela/mensal */}
        {billingType !== 'single' && monthlyValue && (
          <div className="flex items-center gap-3 text-sm">
            <CreditCard size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              {billingType === 'installment' ? 'Valor parcela:' : 'Valor mensal:'}
            </span>
            <span className="font-medium text-foreground ml-auto">
              R$ {monthlyValue.toFixed(2)}
            </span>
          </div>
        )}
        
        {/* Divider */}
        <div className="border-t border-border pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">
              R$ {totalValue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
