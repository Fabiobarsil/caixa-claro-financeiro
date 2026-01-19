export type UserRole = 'admin' | 'operador';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type PaymentStatus = 'pago' | 'pendente' | 'cancelado';
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'outro';
export type ItemType = 'servico' | 'produto';
export type ExpenseType = 'fixa' | 'variavel';
export type ExpenseCategory = 'aluguel' | 'anuncios' | 'materiais' | 'transporte' | 'outros';

export interface Client {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  totalPaid: number;
  totalEntries: number;
  createdAt: Date;
}

export interface ServiceProduct {
  id: string;
  type: ItemType;
  name: string;
  basePrice: number;
  cost?: number;
  notes?: string;
  createdAt: Date;
}

export interface Entry {
  id: string;
  clientId: string;
  clientName: string;
  type: ItemType;
  itemId: string;
  itemName: string;
  quantity: number;
  value: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  date: Date;
  createdAt: Date;
}

export interface Expense {
  id: string;
  type: ExpenseType;
  category: ExpenseCategory;
  value: number;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export interface DashboardMetrics {
  received: number;
  pending: number;
  expenses: number;
  profit: number;
  averageTicket: number;
  totalEntries: number;
}
