import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Search, Filter, Loader2 } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import ReportSummaryCards from '@/components/reports/ReportSummaryCards';
import BillingStatusCards from '@/components/reports/BillingStatusCards';
import CashFlowChart from '@/components/reports/CashFlowChart';
import PaymentOriginChart from '@/components/reports/PaymentOriginChart';
import ClientRanking from '@/components/reports/ClientRanking';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
};

const PER_PAGE = 10;

interface ReportRow {
  id: string;
  cliente: string;
  descricao: string;
  valor: number;
  forma_pagamento: string;
  payment_method_key: string;
  data: string;
  status: 'Pago' | 'Pendente' | 'Atrasado';
  tipo: 'receita' | 'despesa';
}

export default function Reports() {
  const { user, accountId } = useAuth();
  const { transactions, isLoading: txLoading } = useTransactions();

  // Fetch ALL expenses (not limited to current month like useExpenses)
  const { data: allExpenses = [], isLoading: expLoading } = useQuery({
    queryKey: ['report-expenses', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!accountId,
  });

  // Fetch ALL entry_schedules for granular parcela-level status
  const { data: allSchedules = [], isLoading: schedLoading } = useQuery({
    queryKey: ['report-schedules', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entry_schedules')
        .select('*')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!accountId,
  });

  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const today = new Date().toISOString().split('T')[0];

  // Build unified rows from transactions + expenses
  const rows: ReportRow[] = useMemo(() => {
    const txRows: ReportRow[] = transactions.map(t => {
      const dueDate = t.due_date || t.date;
      let status: ReportRow['status'];
      if (t.status === 'pago') {
        status = 'Pago';
      } else if (dueDate < today) {
        status = 'Atrasado';
      } else {
        status = 'Pendente';
      }

      return {
        id: t.id,
        cliente: t.client_name || 'Sem cliente',
        descricao: t.item_name || t.description || '-',
        valor: t.amount,
        forma_pagamento: PAYMENT_LABELS[t.payment_method] || t.payment_method,
        payment_method_key: t.payment_method,
        data: dueDate,
        status,
        tipo: t.type === 'entrada' ? 'receita' as const : 'despesa' as const,
      };
    });

    const expRows: ReportRow[] = allExpenses.map(e => ({
      id: e.id,
      cliente: e.category || 'Despesa',
      descricao: e.notes || e.category || '-',
      valor: e.value,
      forma_pagamento: '-',
      payment_method_key: '',
      data: e.date,
      status: e.status === 'pago' ? 'Pago' as const : (e.date < today ? 'Atrasado' as const : 'Pendente' as const),
      tipo: 'despesa' as const,
    }));

    return [...txRows, ...expRows];
  }, [transactions, allExpenses, today]);

  // Available periods
  const periods = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => set.add(r.data.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [rows]);

  // Filtered rows (single source of truth for ALL sections)
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = search === '' ||
        r.cliente.toLowerCase().includes(search.toLowerCase()) ||
        r.descricao.toLowerCase().includes(search.toLowerCase());
      const matchPeriod = periodFilter === 'all' || r.data.startsWith(periodFilter);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchPeriod && matchStatus;
    });
  }, [rows, search, periodFilter, statusFilter]);

  // 1) Summary — derived from filtered
  const summary = useMemo(() => {
    let recebido = 0, aReceber = 0, despesas = 0;
    filtered.forEach(r => {
      if (r.tipo === 'receita' && r.status === 'Pago') recebido += r.valor;
      if (r.tipo === 'receita' && (r.status === 'Pendente' || r.status === 'Atrasado')) aReceber += r.valor;
      if (r.tipo === 'despesa') despesas += r.valor;
    });
    return { recebido, aReceber, despesas };
  }, [filtered]);

  // 2) Billing status — derived from filtered (receitas only)
  const billingStatus = useMemo(() => {
    const receitas = filtered.filter(r => r.tipo === 'receita');
    const pagos = { count: 0, total: 0 };
    const pendentes = { count: 0, total: 0 };
    const atrasados = { count: 0, total: 0 };

    receitas.forEach(r => {
      if (r.status === 'Pago') {
        pagos.count++;
        pagos.total += r.valor;
      } else if (r.status === 'Atrasado') {
        atrasados.count++;
        atrasados.total += r.valor;
      } else {
        pendentes.count++;
        pendentes.total += r.valor;
      }
    });
    return { pagos, pendentes, atrasados };
  }, [filtered]);

  // 3) Cash flow by day — entradas = receitas pagas, saidas = despesas
  const cashFlowData = useMemo(() => {
    const dayMap: Record<string, { entradas: number; saidas: number }> = {};
    filtered.forEach(r => {
      const day = r.data.substring(8, 10).replace(/^0/, '');
      if (!dayMap[day]) dayMap[day] = { entradas: 0, saidas: 0 };
      if (r.tipo === 'receita' && r.status === 'Pago') dayMap[day].entradas += r.valor;
      if (r.tipo === 'despesa') dayMap[day].saidas += r.valor;
    });
    return Object.entries(dayMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, vals]) => ({ day, ...vals }));
  }, [filtered]);

  // 4) Payment origins — only status Pago
  const paymentOrigins = useMemo(() => {
    const map: Record<string, number> = {};
    filtered
      .filter(r => r.tipo === 'receita' && r.status === 'Pago' && r.payment_method_key)
      .forEach(r => {
        const key = r.forma_pagamento;
        map[key] = (map[key] || 0) + r.valor;
      });
    const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--profit))'];
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [filtered]);

  // 5) Client ranking — only pagamentos confirmados (receitas pagas)
  const clientRanking = useMemo(() => {
    const map: Record<string, number> = {};
    filtered
      .filter(r => r.tipo === 'receita' && r.status === 'Pago')
      .forEach(r => {
        map[r.cliente] = (map[r.cliente] || 0) + r.valor;
      });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginatedRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const applyFilters = () => setPage(1);

  const exportCSV = () => {
    const header = 'Cliente,Descrição,Valor,Pagamento,Data,Status,Tipo\n';
    const csvRows = filtered.map(r =>
      `"${r.cliente}","${r.descricao}",${r.valor},"${r.forma_pagamento}",${r.data},${r.status},${r.tipo}`
    ).join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-financeiro.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => window.print();

  const isLoading = txLoading || expLoading;

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <AppLayout showFab={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h1>
            <p className="text-sm text-muted-foreground">Análise completa de receitas, despesas e cobranças</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <FileText size={16} className="mr-1.5" />
              Exportar PDF
            </Button>
            <Button size="sm" onClick={exportCSV}>
              <Download size={16} className="mr-1.5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar cliente ou descrição"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={periodFilter} onValueChange={v => { setPeriodFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  {periods.map(p => (
                    <SelectItem key={p} value={p}>{formatMonth(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={applyFilters} className="w-full">
                <Filter size={16} className="mr-1.5" />
                Aplicar
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 1) Summary Cards */}
            <ReportSummaryCards
              recebido={summary.recebido}
              aReceber={summary.aReceber}
              despesas={summary.despesas}
            />

            {/* 2) Billing Status + 4) Payment Origins */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BillingStatusCards
                pagos={billingStatus.pagos}
                pendentes={billingStatus.pendentes}
                atrasados={billingStatus.atrasados}
              />
              <PaymentOriginChart data={paymentOrigins} />
            </div>

            {/* 3) Cash Flow Chart */}
            <CashFlowChart data={cashFlowData} />

            {/* 5) Client Ranking */}
            <ClientRanking clients={clientRanking} />

            {/* 6) Detail Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Lançamentos Detalhados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paginatedRows.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="hidden md:table-cell">Pagamento</TableHead>
                        <TableHead className="hidden sm:table-cell">Data</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRows.map(row => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.cliente}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{row.descricao}</TableCell>
                          <TableCell className={row.tipo === 'despesa' ? 'text-destructive' : ''}>
                            {row.tipo === 'despesa' ? '- ' : ''}{formatCurrency(row.valor)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{row.forma_pagamento}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {new Date(row.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary"
                              className={
                                row.status === 'Pago'
                                  ? 'bg-success/15 text-success border-success/30 hover:bg-success/20'
                                  : row.status === 'Atrasado'
                                    ? 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20'
                                    : 'bg-warning/15 text-warning border-warning/30 hover:bg-warning/20'
                              }
                            >
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
