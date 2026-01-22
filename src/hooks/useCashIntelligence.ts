import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, differenceInDays, parseISO } from 'date-fns';

// Learning phases based on days of activity
export type LearningPhase = 1 | 2 | 3;

export interface UserActivityStats {
  firstActivityDate: string | null;
  lastActivityDate: string | null;
  totalDaysActive: number;
  learningPhase: LearningPhase;
}

export interface DailyExpenseStats {
  date: string;
  total: number;
  categories: Record<string, number>;
}

export interface CashInsight {
  type: 'excessive_spending' | 'inactivity' | 'category_repetition' | 'stability';
  message: string;
  priority: number;
}

export interface CashAlert {
  type: 'negative_balance' | 'progressive_decline' | 'spending_concentration';
  message: string;
  priority: number;
}

export interface CashHealthScore {
  score: number;
  status: 'stable' | 'observation' | 'attention';
  statusLabel: string;
}

export interface CashIntelligence {
  userStats: UserActivityStats;
  healthScore: CashHealthScore;
  dailyInsight: CashInsight | null;
  dailyAlert: CashAlert | null;
  activeMessage: { type: 'alert' | 'insight'; message: string } | null;
  isLoading: boolean;
}

// Determine learning phase based on days active
function getLearningPhase(totalDaysActive: number): LearningPhase {
  if (totalDaysActive <= 7) return 1;
  if (totalDaysActive <= 21) return 2;
  return 3;
}

// Get phase-specific message for excessive spending
function getExcessiveSpendingMessage(phase: LearningPhase): string {
  switch (phase) {
    case 1:
      return 'Hoje seus gastos ficaram acima do padrão inicial.';
    case 2:
      return 'Hoje seus gastos ficaram acima do que tem sido comum.';
    case 3:
      return 'Hoje seus gastos ficaram acima do seu padrão habitual.';
  }
}

export function useCashIntelligence(): CashIntelligence {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['cash-intelligence', user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(today, 7), 'yyyy-MM-dd');
      const fiveDaysAgo = format(subDays(today, 5), 'yyyy-MM-dd');

      // Fetch user profile for creation date
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user!.id)
        .maybeSingle();

      // Fetch all entries for activity tracking
      const { data: allEntries } = await supabase
        .from('entries')
        .select('date, created_at')
        .order('date', { ascending: true });

      // Fetch expenses for the last 7 days
      const { data: recentExpenses } = await supabase
        .from('expenses')
        .select('id, value, category, date')
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false });

      // Fetch all expenses to calculate current balance context
      const { data: allExpenses } = await supabase
        .from('expenses')
        .select('value, date')
        .order('date', { ascending: false });

      // Fetch received entries (paid) for balance calculation
      const { data: paidEntries } = await supabase
        .from('entries')
        .select('value, date, status')
        .eq('status', 'pago')
        .order('date', { ascending: false });

      // Calculate user activity stats
      const uniqueDates = new Set((allEntries || []).map(e => e.date));
      const expenseDates = new Set((allExpenses || []).map(e => e.date));
      expenseDates.forEach(d => uniqueDates.add(d));

      const sortedDates = Array.from(uniqueDates).sort();
      const firstActivityDate = sortedDates[0] || null;
      const lastActivityDate = sortedDates[sortedDates.length - 1] || null;
      
      // Calculate total days with any activity
      const totalDaysActive = uniqueDates.size;
      const learningPhase = getLearningPhase(totalDaysActive);

      const userStats: UserActivityStats = {
        firstActivityDate,
        lastActivityDate,
        totalDaysActive,
        learningPhase,
      };

      // ===== CALCULATE HEALTH SCORE =====
      let score = 100;

      // Calculate current balance (simplified: received - expenses)
      const totalReceived = (paidEntries || []).reduce((sum, e) => sum + Number(e.value), 0);
      const totalExpensesValue = (allExpenses || []).reduce((sum, e) => sum + Number(e.value), 0);
      const currentBalance = totalReceived - totalExpensesValue;

      // Negative balance: -20
      if (currentBalance < 0) {
        score -= 20;
      }

      // Inactivity > 2 days: -10
      if (lastActivityDate) {
        const daysSinceLastActivity = differenceInDays(today, parseISO(lastActivityDate));
        if (daysSinceLastActivity > 2) {
          score -= 10;
        }
      }

      // Calculate average daily expense for last 7 days
      const dailyExpenseMap = new Map<string, number>();
      (recentExpenses || []).forEach(exp => {
        const current = dailyExpenseMap.get(exp.date) || 0;
        dailyExpenseMap.set(exp.date, current + Number(exp.value));
      });

      const dailyExpenses = Array.from(dailyExpenseMap.values());
      const avgDailyExpense = dailyExpenses.length > 0 
        ? dailyExpenses.reduce((a, b) => a + b, 0) / dailyExpenses.length 
        : 0;

      const todayExpense = dailyExpenseMap.get(todayStr) || 0;

      // Daily expense > avg * 1.3: -10
      if (avgDailyExpense > 0 && todayExpense > avgDailyExpense * 1.3) {
        score -= 10;
      }

      // Check spending concentration (one category > 60% of week)
      const categoryTotals: Record<string, number> = {};
      let weekTotalExpenses = 0;
      (recentExpenses || []).forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + Number(exp.value);
        weekTotalExpenses += Number(exp.value);
      });

      const maxCategoryValue = Math.max(...Object.values(categoryTotals), 0);
      const hasConcentration = weekTotalExpenses > 0 && (maxCategoryValue / weekTotalExpenses) > 0.6;
      
      if (hasConcentration) {
        score -= 10;
      }

      // Check for 5 consecutive days with records: +10
      const last5Days: string[] = [];
      for (let i = 0; i < 5; i++) {
        last5Days.push(format(subDays(today, i), 'yyyy-MM-dd'));
      }
      const has5ConsecutiveDays = last5Days.every(d => uniqueDates.has(d));
      if (has5ConsecutiveDays) {
        score += 10;
      }

      // Check for 7-day stability (variation < 10%): +10
      if (dailyExpenses.length >= 7) {
        const last7Expenses = dailyExpenses.slice(0, 7);
        const avg7 = last7Expenses.reduce((a, b) => a + b, 0) / 7;
        if (avg7 > 0) {
          const maxVariation = Math.max(...last7Expenses.map(v => Math.abs(v - avg7) / avg7));
          if (maxVariation < 0.1) {
            score += 10;
          }
        }
      }

      // Clamp score between 0 and 100
      score = Math.max(0, Math.min(100, score));

      // Determine status
      let status: CashHealthScore['status'];
      let statusLabel: string;
      if (score >= 80) {
        status = 'stable';
        statusLabel = 'Saúde estável';
      } else if (score >= 50) {
        status = 'observation';
        statusLabel = 'Em observação';
      } else {
        status = 'attention';
        statusLabel = 'Exige atenção';
      }

      const healthScore: CashHealthScore = { score, status, statusLabel };

      // ===== CALCULATE ALERTS (PRIORITY) =====
      let dailyAlert: CashAlert | null = null;

      // 1) Negative balance
      if (currentBalance < 0) {
        dailyAlert = {
          type: 'negative_balance',
          message: 'O saldo ficou negativo hoje. Acompanhar isso de perto pode evitar surpresas.',
          priority: 1,
        };
      }

      // 2) Progressive decline (3 consecutive days of balance drop)
      if (!dailyAlert && dailyExpenses.length >= 3) {
        // Check if expenses increased for 3 consecutive days (simplified proxy for balance decline)
        const last3Days = [0, 1, 2].map(i => format(subDays(today, i), 'yyyy-MM-dd'));
        const last3Expenses = last3Days.map(d => dailyExpenseMap.get(d) || 0);
        
        // If expenses have been increasing (or high) for 3 days, consider it a decline signal
        if (last3Expenses[0] > 0 && last3Expenses[1] > 0 && last3Expenses[2] > 0 &&
            last3Expenses[0] >= last3Expenses[1] && last3Expenses[1] >= last3Expenses[2]) {
          dailyAlert = {
            type: 'progressive_decline',
            message: 'O saldo vem caindo nos últimos dias. Vale acompanhar com mais atenção.',
            priority: 2,
          };
        }
      }

      // 3) Spending concentration
      if (!dailyAlert && hasConcentration) {
        dailyAlert = {
          type: 'spending_concentration',
          message: 'Uma única categoria concentra boa parte dos seus gastos recentes.',
          priority: 3,
        };
      }

      // ===== CALCULATE INSIGHTS (ONLY IF NO ALERT) =====
      let dailyInsight: CashInsight | null = null;

      if (!dailyAlert) {
        // 1) Excessive daily spending
        if (avgDailyExpense > 0 && todayExpense > avgDailyExpense * 1.25) {
          dailyInsight = {
            type: 'excessive_spending',
            message: getExcessiveSpendingMessage(learningPhase),
            priority: 1,
          };
        }

        // 2) Inactivity (no movement today, last activity was before today, max 1 per 48h)
        if (!dailyInsight && lastActivityDate && lastActivityDate < todayStr) {
          const daysSinceLastActivity = differenceInDays(today, parseISO(lastActivityDate));
          // Only show if inactivity is between 1-2 days (48h rule simplified)
          if (daysSinceLastActivity >= 1 && daysSinceLastActivity <= 2) {
            dailyInsight = {
              type: 'inactivity',
              message: 'Hoje não houve movimentações registradas. Se isso for intencional, está tudo certo.',
              priority: 2,
            };
          }
        }

        // 3) Category repetition (same category 3+ times in last 5 days)
        if (!dailyInsight) {
          const last5DaysExpenses = (recentExpenses || []).filter(e => e.date >= fiveDaysAgo);
          const categoryCounts: Record<string, number> = {};
          last5DaysExpenses.forEach(exp => {
            categoryCounts[exp.category] = (categoryCounts[exp.category] || 0) + 1;
          });
          const hasRepetition = Object.values(categoryCounts).some(count => count >= 3);
          if (hasRepetition) {
            dailyInsight = {
              type: 'category_repetition',
              message: 'Esse tipo de despesa tem aparecido com frequência no seu histórico.',
              priority: 3,
            };
          }
        }

        // 4) Stability (variation < 10% for 5 consecutive days)
        if (!dailyInsight && dailyExpenses.length >= 5) {
          const last5Expenses = dailyExpenses.slice(0, 5);
          const avg5 = last5Expenses.reduce((a, b) => a + b, 0) / 5;
          if (avg5 > 0) {
            const maxVariation = Math.max(...last5Expenses.map(v => Math.abs(v - avg5) / avg5));
            if (maxVariation < 0.1) {
              dailyInsight = {
                type: 'stability',
                message: 'Seu caixa está mais estável nos últimos dias.',
                priority: 4,
              };
            }
          }
        }
      }

      // Determine active message (alert takes priority over insight)
      let activeMessage: CashIntelligence['activeMessage'] = null;
      if (dailyAlert) {
        activeMessage = { type: 'alert', message: dailyAlert.message };
      } else if (dailyInsight) {
        activeMessage = { type: 'insight', message: dailyInsight.message };
      }

      return {
        userStats,
        healthScore,
        dailyInsight,
        dailyAlert,
        activeMessage,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    userStats: data?.userStats || {
      firstActivityDate: null,
      lastActivityDate: null,
      totalDaysActive: 0,
      learningPhase: 1,
    },
    healthScore: data?.healthScore || {
      score: 100,
      status: 'stable',
      statusLabel: 'Saúde estável',
    },
    dailyInsight: data?.dailyInsight || null,
    dailyAlert: data?.dailyAlert || null,
    activeMessage: data?.activeMessage || null,
    isLoading,
  };
}
