// This file is deprecated - use useTransactions.ts instead
// Re-export from useTransactions for backward compatibility

import { useTransactions, Transaction as TransactionType } from './useTransactions';

// Alias types for backward compatibility
export type Entry = TransactionType & {
  value: number;
};

export function useEntries() {
  const {
    transactions,
    isLoading,
    error,
    markAsPaid,
    updateTransactionStatus,
    deleteTransaction,
    isAdmin,
  } = useTransactions();

  // Map transactions to entries format for backward compatibility
  const entries: Entry[] = transactions.map(t => ({
    ...t,
    value: t.amount,
    client_name: t.client_name,
    item_name: t.item_name,
    item_type: t.item_type,
  }));

  return {
    entries,
    isLoading,
    error,
    markAsPaid,
    updateEntryStatus: updateTransactionStatus,
    deleteEntry: deleteTransaction,
    isAdmin,
  };
}
