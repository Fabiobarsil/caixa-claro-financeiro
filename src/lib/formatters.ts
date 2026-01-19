export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getDaysAgo(date: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    pix: 'Pix',
    cartao: 'Cartão',
    dinheiro: 'Dinheiro',
    outro: 'Outro',
  };
  return labels[method] || method;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pago: 'Pago',
    pendente: 'Pendente',
    cancelado: 'Cancelado',
  };
  return labels[status] || status;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    aluguel: 'Aluguel',
    anuncios: 'Anúncios',
    materiais: 'Materiais',
    transporte: 'Transporte',
    outros: 'Outros',
  };
  return labels[category] || category;
}
