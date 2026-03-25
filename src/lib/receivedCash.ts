import { supabase } from '@/integrations/supabase/client';

export interface ReceivedCashRow {
  account_id: string;
  source_id: string;
  schedule_id: string | null;
  payment_date: string;
  amount: number;
  amount_paid: number | null;
  source_type: 'transaction' | 'schedule';
  client_id: string | null;
  description: string | null;
  payment_method: string | null;
}

export interface CashReceivedResult {
  total: number;
  byDate: Map<string, number>;
  paidStandaloneCount: number;
  paidScheduleCount: number;
  rows: ReceivedCashRow[];
}

const toCents = (value: number | null | undefined) => Math.round(Number(value ?? 0) * 100);
const fromCents = (value: number) => value / 100;

function getEffectiveValueCents(row: ReceivedCashRow): number {
  const amountCents = toCents(row.amount);
  const amountPaidCents = toCents(row.amount_paid);

  if (amountPaidCents > 0) {
    return Math.min(amountPaidCents, amountCents);
  }

  return amountCents;
}

/**
 * Groups schedule rows that share (source_id, payment_date) to handle
 * bulk payments where amount_paid is duplicated across sibling schedules.
 */
function calculateScheduleGroupCents(group: ReceivedCashRow[]): number {
  const totalAmountCents = group.reduce((sum, item) => sum + toCents(item.amount), 0);
  const repeatedPositivePaidValues = [
    ...new Set(group.map((item) => toCents(item.amount_paid)).filter((value) => value > 0)),
  ];

  if (group.length > 1 && repeatedPositivePaidValues.length === 1) {
    return Math.min(repeatedPositivePaidValues[0], totalAmountCents);
  }

  return group.reduce((sum, item) => sum + getEffectiveValueCents(item), 0);
}

export async function fetchCashReceived({
  accountId,
  startDate,
  endDate,
}: {
  accountId: string;
  startDate?: string;
  endDate?: string;
}): Promise<CashReceivedResult> {
  let query = supabase
    .from('v_received_cash')
    .select('*')
    .eq('account_id', accountId);

  if (startDate) {
    query = query.gte('payment_date', startDate);
  }

  if (endDate) {
    query = query.lte('payment_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = (data || []) as ReceivedCashRow[];

  const standaloneRows = rows.filter(r => r.source_type === 'transaction');
  const scheduleRows = rows.filter(r => r.source_type === 'schedule');

  // --- Standalone totals ---
  let totalCents = 0;
  const byDateCents = new Map<string, number>();

  standaloneRows.forEach(row => {
    const valueCents = getEffectiveValueCents(row);
    totalCents += valueCents;
    byDateCents.set(row.payment_date, (byDateCents.get(row.payment_date) || 0) + valueCents);
  });

  // --- Schedule totals (grouped to handle bulk payments) ---
  const scheduleGroups = new Map<string, ReceivedCashRow[]>();
  scheduleRows.forEach(row => {
    const key = `${row.source_id}::${row.payment_date}`;
    const existing = scheduleGroups.get(key) || [];
    existing.push(row);
    scheduleGroups.set(key, existing);
  });

  scheduleGroups.forEach(group => {
    const paidDate = group[0].payment_date;
    const groupCents = calculateScheduleGroupCents(group);
    totalCents += groupCents;
    byDateCents.set(paidDate, (byDateCents.get(paidDate) || 0) + groupCents);
  });

  return {
    total: fromCents(totalCents),
    byDate: new Map(Array.from(byDateCents.entries()).map(([date, value]) => [date, fromCents(value)])),
    paidStandaloneCount: standaloneRows.length,
    paidScheduleCount: scheduleRows.length,
    rows,
  };
}
