import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServicesProducts, ServiceProduct } from '@/hooks/useServicesProducts';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
type PaymentStatus = 'pago' | 'pendente';
type ItemType = 'servico' | 'produto';

export default function NewEntry() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients, isLoading: clientsLoading } = useClients();
  const { items: servicesProducts, isLoading: itemsLoading } = useServicesProducts();
  
  const [clientId, setClientId] = useState('');
  const [itemType, setItemType] = useState<ItemType>('servico');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitValue, setUnitValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [status, setStatus] = useState<PaymentStatus>('pendente');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter items by type
  const filteredItems = useMemo(() => {
    return servicesProducts.filter(item => item.type === itemType);
  }, [servicesProducts, itemType]);

  // Calculate total
  const totalValue = useMemo(() => {
    const qty = parseInt(quantity) || 0;
    const unit = parseFloat(unitValue) || 0;
    return qty * unit;
  }, [quantity, unitValue]);

  // Reset item selection when type changes
  useEffect(() => {
    setItemId('');
    setUnitValue('');
  }, [itemType]);

  // Auto-fill unit value when item is selected
  const handleItemChange = (id: string) => {
    setItemId(id);
    const item = servicesProducts.find(s => s.id === id);
    if (item) {
      setUnitValue(item.base_price.toString());
    }
  };

  const handleSubmit = async (markAsPaid: boolean = false) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!clientId || !itemId) {
      toast.error('Selecione o cliente e o item');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const finalStatus = markAsPaid ? 'pago' : status;
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase.from('entries').insert({
        user_id: user.id,
        client_id: clientId,
        service_product_id: itemId,
        quantity: parseInt(quantity) || 1,
        value: totalValue,
        payment_method: paymentMethod,
        status: finalStatus,
        date: date,
        due_date: finalStatus === 'pendente' ? dueDate : null,
        payment_date: finalStatus === 'pago' ? today : null,
      });

      if (error) throw error;

      toast.success('Lançamento criado com sucesso!');
      navigate('/lancamentos');
    } catch (error: any) {
      console.error('Erro ao criar lançamento:', error);
      toast.error('Erro ao criar lançamento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = clientsLoading || itemsLoading;

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
          <Label>Cliente *</Label>
          <Select value={clientId} onValueChange={setClientId} disabled={isLoading}>
            <SelectTrigger className="h-12 bg-card">
              <SelectValue placeholder={clientsLoading ? "Carregando..." : "Selecione o cliente"} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clients.length === 0 && !clientsLoading && (
            <p className="text-xs text-muted-foreground">
              Nenhum cliente cadastrado. Adicione um cliente primeiro.
            </p>
          )}
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
          <Label>{itemType === 'servico' ? 'Serviço' : 'Produto'} *</Label>
          <Select value={itemId} onValueChange={handleItemChange} disabled={isLoading}>
            <SelectTrigger className="h-12 bg-card">
              <SelectValue placeholder={itemsLoading ? "Carregando..." : `Selecione o ${itemType}`} />
            </SelectTrigger>
            <SelectContent>
              {filteredItems.length === 0 ? (
                <div className="py-2 px-3 text-sm text-muted-foreground">
                  Nenhum {itemType} cadastrado
                </div>
              ) : (
                filteredItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} - R$ {item.base_price.toFixed(2)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {filteredItems.length === 0 && !itemsLoading && (
            <p className="text-xs text-muted-foreground">
              Cadastre itens em Configurações → Serviços e Produtos
            </p>
          )}
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
            <Label>Valor unit. (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              className="h-12 bg-card"
            />
          </div>
        </div>

        {/* Total */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total</span>
            <span className="text-2xl font-bold text-foreground">
              R$ {totalValue.toFixed(2)}
            </span>
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
              <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
              <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
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

        {/* Data do Lançamento */}
        <div className="space-y-2">
          <Label>Data do lançamento</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 bg-card"
          />
        </div>

        {/* Data de Vencimento (only for pending) */}
        {status === 'pendente' && (
          <div className="space-y-2">
            <Label>Data de vencimento *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-12 bg-card"
            />
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 space-y-3 pb-8">
          <Button
            onClick={() => handleSubmit(false)}
            className="w-full h-12 text-base font-semibold"
            disabled={isSubmitting || !clientId || !itemId || totalValue <= 0}
          >
            {isSubmitting ? (
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
              disabled={isSubmitting || !clientId || !itemId || totalValue <= 0}
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
