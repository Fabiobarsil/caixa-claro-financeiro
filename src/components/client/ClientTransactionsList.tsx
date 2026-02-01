import { useMemo } from 'react';
import { useTransactions, Transaction } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Receipt, Package, Scissors, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import EntryStatusBadge from '@/components/EntryStatusBadge';

interface ClientTransactionsListProps {
  clientId: string;
}

export default function ClientTransactionsList({ clientId }: ClientTransactionsListProps) {
  const { transactions, isLoading } = useTransactions();

  const clientTransactions = useMemo(() => {
    return transactions
      .filter(t => t.client_id === clientId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, clientId]);

  const totals = useMemo(() => {
    return clientTransactions.reduce(
      (acc, t) => {
        if (t.type === 'entrada') {
          acc.entradas += t.amount;
          if (t.status === 'pago') acc.recebido += t.amount;
          else acc.pendente += t.amount;
        } else {
          acc.saidas += t.amount;
        }
        return acc;
      },
      { entradas: 0, saidas: 0, recebido: 0, pendente: 0 }
    );
  }, [clientTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (clientTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Receipt size={40} className="mb-3 opacity-50" />
        <p className="text-sm">Nenhum lançamento vinculado a este cliente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-success/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
          <p className="text-lg font-bold text-success">{formatCurrency(totals.recebido)}</p>
        </div>
        <div className="bg-warning/10 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Pendente</p>
          <p className="text-lg font-bold text-warning">{formatCurrency(totals.pendente)}</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">
          Histórico ({clientTransactions.length} lançamentos)
        </h4>
        
        {clientTransactions.map((transaction) => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>
    </div>
  );
}

interface TransactionCardProps {
  transaction: Transaction;
}

function TransactionCard({ transaction }: TransactionCardProps) {
  const isEntrada = transaction.type === 'entrada';
  
  const getCategoryIcon = () => {
    if (transaction.category === 'servico') return <Scissors size={18} />;
    if (transaction.category === 'produto') return <Package size={18} />;
    return isEntrada ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />;
  };

  const getCategoryLabel = () => {
    const labels = { servico: 'Serviço', produto: 'Produto', outro: 'Outro' };
    return labels[transaction.category] || 'Outro';
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
        isEntrada ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
      )}>
        {getCategoryIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {transaction.description || transaction.item_name || getCategoryLabel()}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(parseISO(transaction.date), "dd MMM yyyy", { locale: ptBR })}
          {transaction.quantity > 1 && ` • ${transaction.quantity}x`}
        </p>
      </div>
      
      <div className="text-right flex flex-col items-end gap-1">
        <p className={cn(
          "font-semibold text-sm",
          isEntrada ? "text-foreground" : "text-destructive"
        )}>
          {isEntrada ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>
        <EntryStatusBadge 
          status={transaction.status}
          dueDate={transaction.due_date}
          paymentDate={transaction.payment_date}
          size="sm"
        />
      </div>
    </div>
  );
}
