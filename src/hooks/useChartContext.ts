import { useState, useCallback, useMemo } from 'react';
import type { DashboardMetrics, ChartDataPoint } from './useDashboard';

// Types for chart context
export type DistributionContextType = 'recebido' | 'despesas' | 'a_receber' | null;
export type EvolutionContextType = string | null; // Date string or null

export interface ChartContext {
  // Distribution chart context
  distributionContext: DistributionContextType;
  setDistributionContext: (context: DistributionContextType) => void;
  
  // Evolution chart context
  evolutionContext: EvolutionContextType;
  setEvolutionContext: (context: EvolutionContextType) => void;
  
  // Active context label for UI
  activeContextLabel: string | null;
  
  // Reset all contexts
  resetContext: () => void;
  
  // Check if any context is active
  hasActiveContext: boolean;
}

export interface FilteredMetrics {
  received: number;
  expenses: number;
  pending: number;
  profit: number;
  totalEntries: number;
  recordCount: number;
}

interface UseChartContextOptions {
  metrics: DashboardMetrics;
  chartData: ChartDataPoint[];
}

export function useChartContext({ metrics, chartData }: UseChartContextOptions): ChartContext & { filteredMetrics: FilteredMetrics } {
  const [distributionContext, setDistributionContext] = useState<DistributionContextType>(null);
  const [evolutionContext, setEvolutionContext] = useState<EvolutionContextType>(null);

  const resetContext = useCallback(() => {
    setDistributionContext(null);
    setEvolutionContext(null);
  }, []);

  const hasActiveContext = distributionContext !== null || evolutionContext !== null;

  // Generate active context label
  const activeContextLabel = useMemo(() => {
    if (distributionContext) {
      const labels: Record<string, string> = {
        recebido: 'Recebido',
        despesas: 'Despesas',
        a_receber: 'A Receber',
      };
      return labels[distributionContext] || null;
    }
    if (evolutionContext) {
      // Format date for display
      const date = new Date(evolutionContext);
      return `até ${date.getDate()}/${date.getMonth() + 1}`;
    }
    return null;
  }, [distributionContext, evolutionContext]);

  // Calculate filtered metrics based on active context
  const filteredMetrics = useMemo((): FilteredMetrics => {
    // Default: return full metrics
    if (!hasActiveContext) {
      return {
        received: metrics.received,
        expenses: metrics.expenses,
        pending: metrics.pending,
        profit: metrics.profit,
        totalEntries: metrics.totalEntries,
        recordCount: metrics.totalEntries,
      };
    }

    // Distribution context: show only the selected category
    if (distributionContext) {
      switch (distributionContext) {
        case 'recebido':
          return {
            received: metrics.received,
            expenses: 0,
            pending: 0,
            profit: metrics.received,
            totalEntries: metrics.totalEntries,
            recordCount: metrics.totalEntries,
          };
        case 'despesas':
          return {
            received: 0,
            expenses: metrics.expenses,
            pending: 0,
            profit: -metrics.expenses,
            totalEntries: 0,
            recordCount: 0,
          };
        case 'a_receber':
          return {
            received: 0,
            expenses: 0,
            pending: metrics.pending,
            profit: 0,
            totalEntries: 0,
            recordCount: 0,
          };
        default:
          break;
      }
    }

    // Evolution context: calculate cumulative values up to selected date
    if (evolutionContext && chartData.length > 0) {
      let cumulativeReceived = 0;
      let cumulativePending = 0;
      
      for (const point of chartData) {
        cumulativeReceived += point.received;
        cumulativePending += point.pending;
        
        if (point.date === evolutionContext) {
          break;
        }
      }

      return {
        received: cumulativeReceived,
        expenses: metrics.expenses, // Expenses don't change with evolution context
        pending: cumulativePending,
        profit: cumulativeReceived - metrics.expenses,
        totalEntries: 0,
        recordCount: 0,
      };
    }

    return {
      received: metrics.received,
      expenses: metrics.expenses,
      pending: metrics.pending,
      profit: metrics.profit,
      totalEntries: metrics.totalEntries,
      recordCount: metrics.totalEntries,
    };
  }, [hasActiveContext, distributionContext, evolutionContext, metrics, chartData]);

  return {
    distributionContext,
    setDistributionContext: useCallback((ctx: DistributionContextType) => {
      setDistributionContext(ctx);
      setEvolutionContext(null); // Clear other context
    }, []),
    evolutionContext,
    setEvolutionContext: useCallback((ctx: EvolutionContextType) => {
      setEvolutionContext(ctx);
      setDistributionContext(null); // Clear other context
    }, []),
    activeContextLabel,
    resetContext,
    hasActiveContext,
    filteredMetrics,
  };
}
