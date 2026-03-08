import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Search, Filter } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useExpenses } from '@/hooks/useExpenses';
import { useLancamentos } from '@/hooks/useLancamentos';
import { formatCurrency } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';

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
  data: string;
  status: string;
  tipo: 'receita' | 'despesa';
}

export default function Reports() {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { lancamentos, isLoading: lancLoading } = useLancamentos();

  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Build unified rows from lancamentos (consolidated view) + include expenses via lancamentos
  const rows: ReportRow[] = useMemo(() => {
    // Use due_date (vencimento) as the reference date for period filtering; fallback to date
    return transactions.map(t => ({
      id: t.id,
      cliente: t.client_name || 'Sem cliente',
      descricao: t.item_name || t.description || '-',
      valor: t.amount,
      forma_pagamento: PAYMENT_LABELS[t.payment_method] || t.payment_method,
      data: t.due_date || t.date,
      status: t.status === 'pago' ? 'Pago' : 'Pendente',
      tipo: t.type === 'entrada' ? 'receita' : 'despesa',
    }));
  }, [transactions]);

  // Available periods from data
  const periods = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      const month = r.data.substring(0, 7); // YYYY-MM
      set.add(month);
    });
    return Array.from(set).sort().reverse();
  }, [rows]);

  // Filtered rows
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

  // Summary
  const summary = useMemo(() => {
    let recebido = 0;
    let aReceber = 0;
    let despesas = 0;
    filtered.forEach(r => {
      if (r.tipo === 'receita' && r.status === 'Pago') recebido += r.valor;
      if (r.tipo === 'receita' && r.status !== 'Pago') aReceber += r.valor;
      if (r.tipo === 'despesa') despesas += r.valor;
    });
    return { recebido, aReceber, despesas };
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginatedRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page on filter change
  const applyFilters = () => setPage(1);

  // Export CSV
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

  // Export PDF (print)
  const exportPDF = () => window.print();

  const isLoading = txLoading || lancLoading;

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
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={applyFilters} className="w-full">
                <Filter size={16} className="mr-1.5" />
                Aplicar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-muted-foreground mb-1">Recebido</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(summary.recebido)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-muted-foreground mb-1">A Receber</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.aReceber)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-muted-foreground mb-1">Despesas</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(summary.despesas)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedRows.length === 0 ? (
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
                        <Badge variant={row.status === 'Pago' ? 'default' : 'secondary'}
                          className={row.status === 'Pago' 
                            ? 'bg-success/15 text-success border-success/30 hover:bg-success/20' 
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

            {/* Pagination */}
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
      </div>
    </AppLayout>
  );
}
