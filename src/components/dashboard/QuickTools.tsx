import { useState } from 'react';
import { Calculator, X, Delete } from 'lucide-react';
import SectionCard from './SectionCard';
import { cn } from '@/lib/utils';

export default function QuickTools() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let newValue: number;

      switch (operation) {
        case '+':
          newValue = currentValue + inputValue;
          break;
        case '-':
          newValue = currentValue - inputValue;
          break;
        case '*':
          newValue = currentValue * inputValue;
          break;
        case '/':
          newValue = currentValue / inputValue;
          break;
        default:
          newValue = inputValue;
      }

      setPreviousValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    let newValue: number;

    switch (operation) {
      case '+':
        newValue = previousValue + inputValue;
        break;
      case '-':
        newValue = previousValue - inputValue;
        break;
      case '*':
        newValue = previousValue * inputValue;
        break;
      case '/':
        newValue = previousValue / inputValue;
        break;
      default:
        return;
    }

    setDisplay(String(newValue));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const buttons = [
    { label: 'C', action: clear, variant: 'function' },
    { label: '±', action: () => setDisplay(String(parseFloat(display) * -1)), variant: 'function' },
    { label: '%', action: () => setDisplay(String(parseFloat(display) / 100)), variant: 'function' },
    { label: '÷', action: () => performOperation('/'), variant: 'operator' },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '×', action: () => performOperation('*'), variant: 'operator' },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '-', action: () => performOperation('-'), variant: 'operator' },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    { label: '+', action: () => performOperation('+'), variant: 'operator' },
    { label: '0', action: () => inputDigit('0'), span: 2 },
    { label: ',', action: inputDecimal },
    { label: '=', action: calculate, variant: 'operator' },
  ];

  return (
    <SectionCard title="Calculadora Rápida">
      <div className="space-y-3">
        {/* Display */}
        <div className="bg-secondary rounded-xl p-4 text-right">
          <p className="text-2xl font-bold text-foreground tabular-nums truncate">
            {display}
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              className={cn(
                'h-11 rounded-xl font-medium text-base transition-all',
                btn.span === 2 && 'col-span-2',
                btn.variant === 'operator' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                btn.variant === 'function' && 'bg-muted text-muted-foreground hover:bg-muted/80',
                !btn.variant && 'bg-secondary text-foreground hover:bg-secondary/80'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
