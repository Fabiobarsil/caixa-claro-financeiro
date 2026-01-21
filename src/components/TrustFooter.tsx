import iconCaixacertus from '@/assets/icon-caixacertus.svg';

interface TrustFooterProps {
  className?: string;
}

export default function TrustFooter({ className }: TrustFooterProps) {
  return (
    <footer className={`py-4 px-4 lg:py-6 border-t border-border bg-card/50 ${className || ''}`}>
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-1.5 text-center">
        <div className="flex items-center gap-2">
          <img 
            src={iconCaixacertus} 
            alt="CaixaCertus" 
            className="h-4 w-4 opacity-60"
          />
          <span className="text-xs font-medium text-muted-foreground">
            CaixaCertus • Controle financeiro com previsibilidade
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Desenvolvido para profissionais que precisam de clareza, não planilhas.
        </p>
      </div>
    </footer>
  );
}
