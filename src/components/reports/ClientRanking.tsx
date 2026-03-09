import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { Trophy } from 'lucide-react';

interface ClientRankingItem {
  name: string;
  total: number;
}

interface ClientRankingProps {
  clients: ClientRankingItem[];
}

export default function ClientRanking({ clients }: ClientRankingProps) {
  const maxValue = clients.length > 0 ? clients[0].total : 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy size={16} className="text-warning" />
          Ranking de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Nenhum cliente com pagamentos no período.
          </div>
        ) : (
          <div className="space-y-3">
            {clients.slice(0, 5).map((client, i) => (
              <div key={client.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}º</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{client.name}</span>
                    <span className="text-sm font-semibold text-success ml-2">{formatCurrency(client.total)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary rounded-full h-1.5 transition-all"
                      style={{ width: `${(client.total / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
