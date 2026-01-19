import { useState, useMemo } from 'react';
import { Client, Entry, Expense, ServiceProduct, DashboardMetrics } from '@/types';

// Mock data
const mockClients: Client[] = [
  { id: '1', name: 'Maria Silva', phone: '11999887766', totalPaid: 850, totalEntries: 5, createdAt: new Date('2024-01-10') },
  { id: '2', name: 'João Santos', phone: '11988776655', totalPaid: 1200, totalEntries: 8, createdAt: new Date('2024-01-15') },
  { id: '3', name: 'Ana Oliveira', phone: '11977665544', totalPaid: 450, totalEntries: 3, createdAt: new Date('2024-02-01') },
  { id: '4', name: 'Carlos Souza', phone: '11966554433', totalPaid: 2100, totalEntries: 12, createdAt: new Date('2024-02-10') },
  { id: '5', name: 'Fernanda Lima', phone: '11955443322', totalPaid: 680, totalEntries: 4, createdAt: new Date('2024-03-01') },
];

const mockServices: ServiceProduct[] = [
  { id: '1', type: 'servico', name: 'Consulta Nutricional', basePrice: 180, createdAt: new Date('2024-01-01') },
  { id: '2', type: 'servico', name: 'Retorno', basePrice: 120, createdAt: new Date('2024-01-01') },
  { id: '3', type: 'servico', name: 'Avaliação Corporal', basePrice: 80, createdAt: new Date('2024-01-01') },
  { id: '4', type: 'produto', name: 'Whey Protein', basePrice: 150, cost: 90, createdAt: new Date('2024-01-01') },
  { id: '5', type: 'produto', name: 'Creatina', basePrice: 80, cost: 45, createdAt: new Date('2024-01-01') },
];

const mockEntries: Entry[] = [
  { id: '1', clientId: '1', clientName: 'Maria Silva', type: 'servico', itemId: '1', itemName: 'Consulta Nutricional', quantity: 1, value: 180, paymentMethod: 'pix', status: 'pago', date: new Date('2024-01-15'), createdAt: new Date() },
  { id: '2', clientId: '2', clientName: 'João Santos', type: 'servico', itemId: '2', itemName: 'Retorno', quantity: 1, value: 120, paymentMethod: 'cartao', status: 'pago', date: new Date('2024-01-16'), createdAt: new Date() },
  { id: '3', clientId: '3', clientName: 'Ana Oliveira', type: 'produto', itemId: '4', itemName: 'Whey Protein', quantity: 2, value: 300, paymentMethod: 'pix', status: 'pendente', date: new Date('2024-01-17'), createdAt: new Date() },
  { id: '4', clientId: '4', clientName: 'Carlos Souza', type: 'servico', itemId: '1', itemName: 'Consulta Nutricional', quantity: 1, value: 180, paymentMethod: 'dinheiro', status: 'pago', date: new Date('2024-01-18'), createdAt: new Date() },
  { id: '5', clientId: '5', clientName: 'Fernanda Lima', type: 'servico', itemId: '3', itemName: 'Avaliação Corporal', quantity: 1, value: 80, paymentMethod: 'pix', status: 'pendente', date: new Date('2024-01-19'), createdAt: new Date() },
  { id: '6', clientId: '1', clientName: 'Maria Silva', type: 'produto', itemId: '5', itemName: 'Creatina', quantity: 1, value: 80, paymentMethod: 'cartao', status: 'pago', date: new Date('2024-01-20'), createdAt: new Date() },
];

const mockExpenses: Expense[] = [
  { id: '1', type: 'fixa', category: 'aluguel', value: 1500, date: new Date('2024-01-05'), createdAt: new Date() },
  { id: '2', type: 'variavel', category: 'materiais', value: 350, date: new Date('2024-01-10'), notes: 'Material de escritório', createdAt: new Date() },
  { id: '3', type: 'variavel', category: 'anuncios', value: 200, date: new Date('2024-01-12'), notes: 'Instagram Ads', createdAt: new Date() },
  { id: '4', type: 'variavel', category: 'transporte', value: 150, date: new Date('2024-01-15'), createdAt: new Date() },
];

export function useMockData() {
  const [clients] = useState<Client[]>(mockClients);
  const [entries] = useState<Entry[]>(mockEntries);
  const [expenses] = useState<Expense[]>(mockExpenses);
  const [services] = useState<ServiceProduct[]>(mockServices);

  const metrics = useMemo<DashboardMetrics>(() => {
    const received = entries
      .filter(e => e.status === 'pago')
      .reduce((sum, e) => sum + e.value, 0);
    
    const pending = entries
      .filter(e => e.status === 'pendente')
      .reduce((sum, e) => sum + e.value, 0);
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    
    const paidEntries = entries.filter(e => e.status === 'pago');
    const averageTicket = paidEntries.length > 0 
      ? received / paidEntries.length 
      : 0;

    return {
      received,
      pending,
      expenses: totalExpenses,
      profit: received - totalExpenses,
      averageTicket,
      totalEntries: entries.filter(e => e.status !== 'cancelado').length,
    };
  }, [entries, expenses]);

  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [entries]);

  const pendingEntries = useMemo(() => {
    return entries
      .filter(e => e.status === 'pendente')
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [entries]);

  return {
    clients,
    entries,
    expenses,
    services,
    metrics,
    recentEntries,
    pendingEntries,
  };
}
