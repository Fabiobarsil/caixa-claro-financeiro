import { supabase } from '@/integrations/supabase/client';

export interface PaidTransactionRow {
  id: string;
  amount: number | null;
  amount_paid: number | null;
  payment_date: string | null;
}

export interface PaidScheduleRow {
  id: string;
  entry_id: string;
  amount: number | null;
  amount_paid: number | null;
  paid_at: string | null;
}

export interface CashReceivedResult {
  total: number;
  byDate: Map<string, number>;
  paidStandaloneCount: number;
  paidScheduleCount: number;
  paidStandaloneRows: PaidTransactionRow[];
  paidScheduleRows: PaidScheduleRow[];
}

const toCents = (value: number | null | undefined) => Math.round(Number(value ?? 0) * 100);
const fromCents = (value: number) => value / 100;

function getEffectivePaidTransactionRowCents(transaction: PaidTransactionRow): number {
  const amountCents = toCents(transaction.amount);
  const amountPaidCents = toCents(transaction.amount_paid);

  if (amountPaidCents > 0) {
    return Math.min(amountPaidCents, amountCents);
  }

  return amountCents;
}

function getEffectivePaidScheduleRowCents(schedule: PaidScheduleRow): number {
  const amountCents = toCents(schedule.amount);
  const amountPaidCents = toCents(schedule.amount_paid);

  if (amountPaidCents > 0) {
    return Math.min(amountPaidCents, amountCents);
  }

  return amountCents;
}

function calculatePaidSchedulesCash(schedules: PaidScheduleRow[]) {
  const groups = new Map<string, PaidScheduleRow[]>();

  schedules.forEach((schedule) => {
    if (!schedule.paid_at) return;
    const key = `${schedule.entry_id}::${schedule.paid_at}`;
    const existing = groups.get(key) || [];
    existing.push(schedule);
    groups.set(key, existing);
  });

  const byDateCents = new Map<string, number>();
  let totalCents = 0;

  groups.forEach((group) => {
    const paidAt = group[0]?.paid_at;
    if (!paidAt) return;

    const paidDate = paidAt.slice(0, 10);
    const totalAmountCents = group.reduce((sum, item) => sum + toCents(item.amount), 0);
    const repeatedPositivePaidValues = [
      ...new Set(group.map((item) => toCents(item.amount_paid)).filter((value) => value > 0)),
    ];

    const groupReceivedCents =
      group.length > 1 && repeatedPositivePaidValues.length === 1
        ? Math.min(repeatedPositivePaidValues[0], totalAmountCents)
        : group.reduce((sum, item) => sum + getEffectivePaidScheduleRowCents(item), 0);

    totalCents += groupReceivedCents;
    byDateCents.set(paidDate, (byDateCents.get(paidDate) || 0) + groupReceivedCents);
  });

  return {
    total: fromCents(totalCents),
    byDate: new Map(Array.from(byDateCents.entries()).map(([date, value]) => [date, fromCents(value)])),
  };
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
  let paidTransactionsQuery = supabase
    .from('transactions')
    .select('id, amount, amount_paid, payment_date')
    .eq('account_id', accountId)
    .eq('type', 'entrada')
    .eq('status', 'pago')
    .not('payment_date', 'is', null);

  if (startDate) {
    paidTransactionsQuery = paidTransactionsQuery.gte('payment_date', startDate);
  }

  if (endDate) {
    paidTransactionsQuery = paidTransactionsQuery.lte('payment_date', endDate);
  }

  const { data: paidTransactions, error: paidTransactionsError } = await paidTransactionsQuery;

  if (paidTransactionsError) {
    throw paidTransactionsError;
  }

  const transactionIds = (paidTransactions || []).map((transaction) => transaction.id);
  let standaloneTransactions = (paidTransactions || []) as PaidTransactionRow[];

  if (transactionIds.length > 0) {
    const { data: schedulesForTransactions, error: schedulesForTransactionsError } = await supabase
      .from('entry_schedules')
      .select('entry_id')
      .in('entry_id', transactionIds);

    if (schedulesForTransactionsError) {
      throw schedulesForTransactionsError;
    }

    const idsWithSchedules = new Set((schedulesForTransactions || []).map((schedule) => schedule.entry_id));
    standaloneTransactions = standaloneTransactions.filter((transaction) => !idsWithSchedules.has(transaction.id));
  }

  const standaloneByDateCents = new Map<string, number>();
  const standaloneTotalCents = standaloneTransactions.reduce((sum, transaction) => {
    const paymentDate = transaction.payment_date;
    const valueCents = getEffectivePaidTransactionRowCents(transaction);

    if (paymentDate) {
      standaloneByDateCents.set(paymentDate, (standaloneByDateCents.get(paymentDate) || 0) + valueCents);
    }

    return sum + valueCents;
  }, 0);

  let paidSchedulesQuery = supabase
    .from('entry_schedules')
    .select('id, entry_id, amount, amount_paid, paid_at')
    .eq('account_id', accountId)
    .eq('status', 'pago')
    .not('paid_at', 'is', null);

  if (startDate) {
    paidSchedulesQuery = paidSchedulesQuery.gte('paid_at', `${startDate}T00:00:00`);
  }

  if (endDate) {
    paidSchedulesQuery = paidSchedulesQuery.lte('paid_at', `${endDate}T23:59:59.999`);
  }

  const { data: paidSchedules, error: paidSchedulesError } = await paidSchedulesQuery;

  if (paidSchedulesError) {
    throw paidSchedulesError;
  }

  const paidScheduleRows = (paidSchedules || []) as PaidScheduleRow[];
  const scheduleCash = calculatePaidSchedulesCash(paidScheduleRows);

  const combinedByDateCents = new Map<string, number>(standaloneByDateCents);
  scheduleCash.byDate.forEach((value, date) => {
    combinedByDateCents.set(date, (combinedByDateCents.get(date) || 0) + toCents(value));
  });

  return {
    total: fromCents(standaloneTotalCents) + scheduleCash.total,
    byDate: new Map(Array.from(combinedByDateCents.entries()).map(([date, value]) => [date, fromCents(value)])),
    paidStandaloneCount: standaloneTransactions.length,
    paidScheduleCount: paidScheduleRows.length,
    paidStandaloneRows: standaloneTransactions,
    paidScheduleRows,
  };
}