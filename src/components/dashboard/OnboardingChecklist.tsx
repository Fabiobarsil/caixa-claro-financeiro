import { useNavigate } from 'react-router-dom';
import { Check, Circle, ChevronRight, Sparkles, PartyPopper } from 'lucide-react';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { cn } from '@/lib/utils';

interface OnboardingChecklistProps {
  isAdmin: boolean;
}

export default function OnboardingChecklist({ isAdmin }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const { steps, completedCount, totalSteps, isComplete, isLoading } = useOnboardingProgress();

  // Only show for admins with incomplete steps
  if (!isAdmin || isLoading) return null;

  // Show completion message briefly, then hide checklist
  if (isComplete) {
    return (
      <div className="bg-gradient-to-r from-success/10 via-success/5 to-transparent rounded-xl border border-success/20 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
            <PartyPopper className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Tudo pronto!
            </h3>
            <p className="text-sm text-muted-foreground">
              Seu sistema está configurado. Acompanhe seu caixa no dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm text-foreground">
            Primeiros passos
          </h3>
          <p className="text-xs text-muted-foreground">
            {completedCount} de {totalSteps} concluídos
          </p>
        </div>
        {/* Progress indicator */}
        <div className="flex gap-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                step.completed ? "bg-success" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => !step.completed && navigate(step.route)}
            disabled={step.completed}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
              step.completed 
                ? "bg-transparent cursor-default" 
                : "hover:bg-accent/50 cursor-pointer"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
              step.completed 
                ? "bg-success text-success-foreground" 
                : "border border-muted-foreground/30"
            )}>
              {step.completed ? (
                <Check className="w-3 h-3" />
              ) : (
                <Circle className="w-2 h-2 text-muted-foreground/50" />
              )}
            </div>
            <span className={cn(
              "flex-1 text-sm",
              step.completed 
                ? "text-muted-foreground line-through" 
                : "text-foreground"
            )}>
              {step.title}
            </span>
            {!step.completed && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
