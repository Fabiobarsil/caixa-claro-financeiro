import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import iconCaixacertus from '@/assets/icon-caixacertus.svg';

interface TrustFooterProps {
  className?: string;
}

export default function TrustFooter({ className }: TrustFooterProps) {
  return (
    <footer className={`py-4 px-4 lg:py-6 border-t border-border bg-card/50 ${className || ''}`}>
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-3 text-center">
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
        
        {/* Legal Links */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <Link 
            to="/privacidade" 
            className="hover:text-muted-foreground transition-colors"
          >
            Privacidade
          </Link>
          <span>•</span>
          <Link 
            to="/termos" 
            className="hover:text-muted-foreground transition-colors"
          >
            Termos de Uso
          </Link>
          <span>•</span>
          <Link 
            to="/lgpd" 
            className="hover:text-muted-foreground transition-colors flex items-center gap-1"
          >
            <Shield size={10} />
            LGPD
          </Link>
        </div>

        <p className="text-[10px] text-muted-foreground/50">
          Sistema licenciado • Todos os direitos reservados © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
