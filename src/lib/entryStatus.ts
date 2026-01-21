import { differenceInDays, format, parseISO, isValid } from 'date-fns';

export type VisualStatus = 'pago' | 'a_vencer' | 'vencido';

export interface EntryVisualInfo {
  visualStatus: VisualStatus;
  label: string;
  variant: 'success' | 'warning' | 'destructive';
}

/**
 * Calculates the visual status and label for an entry based on its status and dates
 */
export function getEntryVisualInfo(
  status: 'pago' | 'pendente',
  dueDate: string | null,
  paymentDate: string | null
): EntryVisualInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (status === 'pago') {
    const paidDate = paymentDate ? parseISO(paymentDate) : null;
    const label = paidDate && isValid(paidDate) 
      ? `Pago em ${format(paidDate, 'dd/MM')}`
      : 'Pago';
    
    return {
      visualStatus: 'pago',
      label,
      variant: 'success',
    };
  }

  // status === 'pendente'
  if (!dueDate) {
    return {
      visualStatus: 'a_vencer',
      label: 'Pendente',
      variant: 'warning',
    };
  }

  const due = parseISO(dueDate);
  if (!isValid(due)) {
    return {
      visualStatus: 'a_vencer',
      label: 'Pendente',
      variant: 'warning',
    };
  }

  due.setHours(0, 0, 0, 0);
  const diffDays = differenceInDays(due, today);

  if (diffDays > 0) {
    // Future due date
    return {
      visualStatus: 'a_vencer',
      label: `Vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
      variant: 'warning',
    };
  } else if (diffDays === 0) {
    // Due today
    return {
      visualStatus: 'a_vencer',
      label: 'Vence hoje',
      variant: 'warning',
    };
  } else {
    // Past due date (overdue)
    const overdueDays = Math.abs(diffDays);
    return {
      visualStatus: 'vencido',
      label: `Vencido há ${overdueDays} ${overdueDays === 1 ? 'dia' : 'dias'}`,
      variant: 'destructive',
    };
  }
}

/**
 * Filter entries by visual status
 */
export function filterEntriesByVisualStatus<T extends { status: 'pago' | 'pendente'; due_date?: string | null }>(
  entries: T[],
  filter: 'todos' | 'pago' | 'a_vencer' | 'vencido'
): T[] {
  if (filter === 'todos') return entries;
  
  return entries.filter(entry => {
    const info = getEntryVisualInfo(entry.status, entry.due_date || null, null);
    return info.visualStatus === filter;
  });
}
