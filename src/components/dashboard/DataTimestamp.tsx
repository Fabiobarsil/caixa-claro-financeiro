import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw } from 'lucide-react';

interface DataTimestampProps {
  className?: string;
}

export default function DataTimestamp({ className }: DataTimestampProps) {
  const [timestamp, setTimestamp] = useState(new Date());

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setTimestamp(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formattedDate = format(timestamp, "dd/MM/yyyy", { locale: ptBR });
  const formattedTime = format(timestamp, "HH:mm", { locale: ptBR });

  return (
    <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className || ''}`}>
      <RefreshCw size={12} className="opacity-60" />
      <span>Dados atualizados em: {formattedDate} • {formattedTime}</span>
    </div>
  );
}
