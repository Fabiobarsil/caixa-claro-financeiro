import { useMemo } from 'react';
import { useEntries } from './useEntries';
import { useClients } from './useClients';
import { useServicesProducts } from './useServicesProducts';

const ONBOARDING_DISMISSED_KEY = 'caixacertus_onboarding_dismissed';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  route: string;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  isLoading: boolean;
}

export function useOnboardingProgress(): OnboardingProgress {
  const { entries, isLoading: entriesLoading } = useEntries();
  const { clients, isLoading: clientsLoading } = useClients();
  const { items: servicesProducts, isLoading: servicesLoading } = useServicesProducts();

  const isLoading = entriesLoading || clientsLoading || servicesLoading;

  const steps = useMemo<OnboardingStep[]>(() => [
    {
      id: 'services',
      title: 'Cadastrar serviço ou produto',
      description: 'Defina o que você oferece para facilitar os lançamentos.',
      completed: servicesProducts.length > 0,
      route: '/servicos-produtos',
    },
    {
      id: 'clients',
      title: 'Cadastrar cliente',
      description: 'Organize seus atendimentos por cliente.',
      completed: clients.length > 0,
      route: '/clientes',
    },
    {
      id: 'entries',
      title: 'Registrar lançamento',
      description: 'Comece a acompanhar seu fluxo de caixa.',
      completed: entries.length > 0,
      route: '/novo-lancamento',
    },
  ], [servicesProducts.length, clients.length, entries.length]);

  const completedCount = steps.filter(s => s.completed).length;
  const isComplete = completedCount === steps.length;

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    isComplete,
    isLoading,
  };
}

export function isOnboardingDismissed(): boolean {
  return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';
}

export function dismissOnboarding(): void {
  localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
}
