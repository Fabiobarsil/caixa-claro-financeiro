import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '@/hooks/useMockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'outro';
type PaymentStatus = 'pago' | 'pendente';

export default function NewEntry() {
  const navigate = useNavigate();
  const { clients, services } = useMockData();
  
  const [clientId, setClientId] = useState('');
  const [itemType, setItemType] = useState<'servico' | 'produto'>('servico');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [status, setStatus] = useState<PaymentStatus>('pendente');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredItems = services.filter(s => s.type === itemType);

  const handleItemChange = (id: string) => {
    setItemId(id);
    const item = services.find(s => s.id === id);
    if (item) {
      setValue(item.basePrice.toString());
    }
  };

  const handleSubmit = async (markAsPaid: boolean = false) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    toast.success('Lançamento criado com sucesso!');
    navigate('/lancamentos');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Novo lançamento</h1>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-5">
        {/* Cliente */}
        <div className="space-y-2">
          <Label>Cliente</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="h-12 bg-card">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setItemType('servico')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                itemType === 'servico'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              Serviço
            </button>
            <button
              onClick={() => setItemType('produto')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                itemType === 'produto'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              Produto
            </button>
          </div>
        </div>

        {/* Item */}
        <div className="space-y-2">
          <Label>{itemType === 'servico' ? 'Serviço' : 'Produto'}</Label>
          <Select value={itemId} onValueChange={handleItemChange}>
            <SelectTrigger className="h-12 bg-card">
              <SelectValue placeholder={`Selecione o ${itemType}`} />
            </SelectTrigger>
            <SelectContent>
              {filteredItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} - R$ {item.basePrice.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantidade e Valor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-12 bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-12 bg-card"
            />
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="space-y-2">
          <Label>Forma de pagamento</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger className="h-12 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pix">Pix</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('pendente')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                status === 'pendente'
                  ? 'bg-warning text-warning-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              Pendente
            </button>
            <button
              onClick={() => setStatus('pago')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                status === 'pago'
                  ? 'bg-success text-success-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              Pago
            </button>
          </div>
        </div>

        {/* Data */}
        <div className="space-y-2">
          <Label>Data</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 bg-card"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-3">
          <Button
            onClick={() => handleSubmit(false)}
            className="w-full h-12 text-base font-semibold"
            disabled={isLoading || !clientId || !itemId}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
          
          {status === 'pendente' && (
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              className="w-full h-12 text-base font-semibold border-success text-success hover:bg-success hover:text-success-foreground"
              disabled={isLoading || !clientId || !itemId}
            >
              <Check className="mr-2 h-4 w-4" />
              Salvar e marcar como pago
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
