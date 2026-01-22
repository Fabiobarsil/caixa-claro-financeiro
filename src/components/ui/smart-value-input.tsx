import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SmartValueInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Avalia uma expressão matemática simples de forma segura.
 * Aceita números e operadores: + - * /
 * Retorna null se a expressão for inválida.
 */
function evaluateExpression(expr: string): number | null {
  // Remove espaços e substitui vírgula por ponto
  const sanitized = expr.replace(/\s/g, '').replace(',', '.');
  
  // Se estiver vazio ou for apenas um número, retornar o número
  if (!sanitized) return null;
  
  // Verificar se é apenas um número
  const simpleNumber = parseFloat(sanitized);
  if (!isNaN(simpleNumber) && /^-?\d*\.?\d+$/.test(sanitized)) {
    return simpleNumber;
  }
  
  // Verificar se contém apenas caracteres permitidos
  if (!/^[\d+\-*/.,\s()]+$/.test(sanitized)) {
    return null;
  }
  
  // Verificar se termina com operador (expressão incompleta)
  if (/[+\-*/]$/.test(sanitized)) {
    return null;
  }
  
  try {
    // Usar Function para avaliar a expressão de forma segura
    // Isso é seguro porque já validamos que só contém números e operadores
    const result = new Function(`return (${sanitized})`)();
    
    if (typeof result === 'number' && isFinite(result) && !isNaN(result)) {
      return Math.round(result * 100) / 100; // Arredondar para 2 casas decimais
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Verifica se uma string contém operadores matemáticos.
 */
function hasOperators(value: string): boolean {
  return /[+\-*/]/.test(value.replace(/^-/, '')); // Ignora negativo no início
}

/**
 * SmartValueInput - Campo de valor com suporte a expressões matemáticas inline
 * 
 * Comportamento:
 * - Aceita números e operadores (+, -, *, /)
 * - Avalia a expressão ao pressionar Enter ou sair do campo
 * - Mostra feedback discreto com o resultado calculado
 * - Funciona igual em mobile e desktop
 * - Não abre modais ou captura foco global
 */
export default function SmartValueInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  disabled = false,
}: SmartValueInputProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [preview, setPreview] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Sincronizar displayValue com value externo
  useEffect(() => {
    setDisplayValue(value);
    // Calcular preview inicial se tiver operadores
    if (hasOperators(value)) {
      setPreview(evaluateExpression(value));
    } else {
      setPreview(null);
    }
  }, [value]);
  
  // Atualizar preview enquanto digita
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    // Mostrar preview se tiver operadores
    if (hasOperators(newValue)) {
      const result = evaluateExpression(newValue);
      setPreview(result);
    } else {
      setPreview(null);
    }
    
    // Passar valor bruto para o pai (será avaliado no blur/submit)
    onChange(newValue);
  }, [onChange]);
  
  // Avaliar expressão e converter para valor final
  const evaluateAndSet = useCallback(() => {
    if (!displayValue) return;
    
    // Se não tiver operadores, apenas formatar
    if (!hasOperators(displayValue)) {
      const num = parseFloat(displayValue.replace(',', '.'));
      if (!isNaN(num)) {
        onChange(num.toString());
      }
      setPreview(null);
      return;
    }
    
    const result = evaluateExpression(displayValue);
    if (result !== null) {
      setDisplayValue(result.toString());
      onChange(result.toString());
      setPreview(null);
    }
  }, [displayValue, onChange]);
  
  // Avaliar no blur
  const handleBlur = useCallback(() => {
    evaluateAndSet();
  }, [evaluateAndSet]);
  
  // Avaliar no Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      evaluateAndSet();
      inputRef.current?.blur();
    }
  }, [evaluateAndSet]);
  
  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("h-11 bg-background", className)}
        autoComplete="off"
      />
      
      {/* Preview discreto do resultado */}
      {preview !== null && (
        <div className="absolute right-0 top-full mt-1 text-xs text-success bg-success/10 px-2 py-1 rounded-md border border-success/20 z-10">
          = R$ {preview.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}
