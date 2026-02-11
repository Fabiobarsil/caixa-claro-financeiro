import { useState, useCallback, useMemo } from 'react';
import type { 
  FinancialSnapshot, 
  ChartDataPoint,
} from './useFinancialSnapshot';

export type DistributionContextType = 'recebido' | 'a_receber' | 'em_atraso' | null;
import type { EvolutionContextType } from '@/components/dashboard/FinancialEvolutionChart';

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

export interface FilteredSnapshot {
  recebido: number;
  a_receber: number;
  em_atraso: number;
  despesas_pagas: number;
  lucro_real: number;
  total_atendimentos: number;
}

interface UseChartContextOptions {
  snapshot: FinancialSnapshot;
  chartData: ChartDataPoint[];
}

export function useChartContext({ snapshot, chartData }: UseChartContextOptions): ChartContext & { filteredSnapshot: FilteredSnapshot } {
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
        a_receber: 'A Receber',
        em_atraso: 'Em Atraso',
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

  // Calculate filtered snapshot based on active context
  const filteredSnapshot = useMemo((): FilteredSnapshot => {
    // Default: return full snapshot
    if (!hasActiveContext) {
      return {
        recebido: snapshot.recebido,
        a_receber: snapshot.a_receber,
        em_atraso: snapshot.em_atraso,
        despesas_pagas: snapshot.despesas_pagas,
        lucro_real: snapshot.lucro_real,
        total_atendimentos: snapshot.total_atendimentos,
      };
    }

    // Distribution context: show only the selected category
    if (distributionContext) {
      switch (distributionContext) {
        case 'recebido':
          return {
            recebido: snapshot.recebido,
            a_receber: 0,
            em_atraso: 0,
            despesas_pagas: 0,
            lucro_real: snapshot.recebido,
            total_atendimentos: snapshot.total_atendimentos,
          };
        case 'a_receber':
          return {
            recebido: 0,
            a_receber: snapshot.a_receber,
            em_atraso: 0,
            despesas_pagas: 0,
            lucro_real: 0,
            total_atendimentos: 0,
          };
        case 'em_atraso':
          return {
            recebido: 0,
            a_receber: 0,
            em_atraso: snapshot.em_atraso,
            despesas_pagas: 0,
            lucro_real: 0,
            total_atendimentos: 0,
          };
        default:
          break;
      }
    }

    // Evolution context: calculate cumulative values up to selected date
    if (evolutionContext && chartData.length > 0) {
      let cumulativeRecebido = 0;
      let cumulativeDespesas = 0;
      
      for (const point of chartData) {
        if (point.date <= evolutionContext) {
          cumulativeRecebido = point.recebido;
          cumulativeDespesas = point.despesas;
        } else {
          break;
        }
      }

      return {
        recebido: cumulativeRecebido,
        a_receber: snapshot.a_receber, // Doesn't change with evolution
        em_atraso: snapshot.em_atraso, // Doesn't change with evolution
        despesas_pagas: cumulativeDespesas,
        lucro_real: cumulativeRecebido - cumulativeDespesas,
        total_atendimentos: 0,
      };
    }

    return {
      recebido: snapshot.recebido,
      a_receber: snapshot.a_receber,
      em_atraso: snapshot.em_atraso,
      despesas_pagas: snapshot.despesas_pagas,
      lucro_real: snapshot.lucro_real,
      total_atendimentos: snapshot.total_atendimentos,
    };
  }, [hasActiveContext, distributionContext, evolutionContext, snapshot, chartData]);

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
    filteredSnapshot,
  };
}
