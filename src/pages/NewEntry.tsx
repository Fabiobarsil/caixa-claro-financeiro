import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServicesProducts, ServiceProduct } from '@/hooks/useServicesProducts';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { useEntrySchedules, getDefaultDueDate } from '@/hooks/useEntrySchedules';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Check, Loader2, Calendar, CreditCard, Package } from 'lucide-react';
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
  const { createSchedules } = useEntrySchedules();
  
  const [clientId, setClientId] = useState('');
  const [itemType, setItemType] = useState<ItemType>('servico');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitValue, setUnitValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [status, setStatus] = useState<PaymentStatus>('pendente');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment rules state
  const [customDueDate, setCustomDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(() => getDefaultDueDate(new Date().toISOString().split('T')[0]));
  const [isInstallment, setIsInstallment] = useState(false);
  const [isMonthlyPackage, setIsMonthlyPackage] = useState(false);
  const [installmentsTotal, setInstallmentsTotal] = useState('3');
  const [intervalDays, setIntervalDays] = useState('30');
  const [firstDueDate, setFirstDueDate] = useState(() => getDefaultDueDate(new Date().toISOString().split('T')[0]));
  const [monthsTotal, setMonthsTotal] = useState('3');

  // Update default due date when entry date changes
  useEffect(() => {
    if (!customDueDate) {
      setDueDate(getDefaultDueDate(date));
    }
    setFirstDueDate(getDefaultDueDate(date));
  }, [date, customDueDate]);

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

  // Calculate installment value
  const installmentValue = useMemo(() => {
    const count = parseInt(installmentsTotal) || 1;
    return totalValue / count;
  }, [totalValue, installmentsTotal]);

  // Calculate monthly value
  const monthlyValue = useMemo(() => {
    const count = parseInt(monthsTotal) || 1;
    return totalValue / count;
  }, [totalValue, monthsTotal]);

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

  // Handle installment toggle
  const handleInstallmentToggle = (checked: boolean) => {
    setIsInstallment(checked);
    if (checked) setIsMonthlyPackage(false);
  };

  // Handle monthly package toggle
  const handleMonthlyPackageToggle = (checked: boolean) => {
    setIsMonthlyPackage(checked);
    if (checked) setIsInstallment(false);
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
      
      // Calculate effective due date
      const effectiveDueDate = customDueDate ? dueDate : getDefaultDueDate(date);
      
      // Create the base entry
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .insert({
          user_id: user.id,
          client_id: clientId,
          service_product_id: itemId,
          quantity: parseInt(quantity) || 1,
          value: totalValue,
          payment_method: paymentMethod,
          status: finalStatus,
          date: date,
          due_date: finalStatus === 'pendente' ? effectiveDueDate : null,
          payment_date: finalStatus === 'pago' ? today : null,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create schedules if installment or monthly package
      if (isInstallment && finalStatus === 'pendente') {
        await createSchedules.mutateAsync({
          entry_id: entryData.id,
          schedule_type: 'installment',
          total_value: totalValue,
          installments_total: parseInt(installmentsTotal) || 1,
          first_due_date: firstDueDate,
          interval_days: parseInt(intervalDays) || 30,
        });
      } else if (isMonthlyPackage && finalStatus === 'pendente') {
        await createSchedules.mutateAsync({
          entry_id: entryData.id,
          schedule_type: 'monthly_package',
          total_value: totalValue,
          installments_total: parseInt(monthsTotal) || 1,
          first_due_date: firstDueDate,
          interval_days: 30, // Monthly = 30 days interval
        });
      }

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

        {/* Payment Rules Section - Only for pending status */}
        {status === 'pendente' && (
          <div className="bg-card rounded-xl p-4 border border-border space-y-4">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <CreditCard size={18} />
              Regras de Pagamento
            </div>

            {/* Custom Due Date Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-muted-foreground" />
                <Label className="cursor-pointer">Vencimento personalizado</Label>
              </div>
              <Switch
                checked={customDueDate}
                onCheckedChange={setCustomDueDate}
              />
            </div>
            
            {customDueDate && (
              <div className="space-y-2 pl-6">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 bg-background"
                />
              </div>
            )}

            {!customDueDate && (
              <p className="text-xs text-muted-foreground pl-6">
                Vencimento padrão: 30 dias após a data do lançamento ({dueDate})
              </p>
            )}

            {/* Installment Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-muted-foreground" />
                <Label className="cursor-pointer">Pagamento parcelado?</Label>
              </div>
              <Switch
                checked={isInstallment}
                onCheckedChange={handleInstallmentToggle}
                disabled={isMonthlyPackage}
              />
            </div>

            {isInstallment && (
              <div className="space-y-3 pl-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nº de parcelas</Label>
                    <Input
                      type="number"
                      min="2"
                      max="12"
                      value={installmentsTotal}
                      onChange={(e) => setInstallmentsTotal(e.target.value)}
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Intervalo (dias)</Label>
                    <Input
                      type="number"
                      min="7"
                      max="60"
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(e.target.value)}
                      className="h-10 bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">1ª parcela vence em</Label>
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-sm font-medium text-primary">
                    {installmentsTotal}x de R$ {installmentValue.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Monthly Package Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-muted-foreground" />
                <Label className="cursor-pointer">Pacote mensal?</Label>
              </div>
              <Switch
                checked={isMonthlyPackage}
                onCheckedChange={handleMonthlyPackageToggle}
                disabled={isInstallment}
              />
            </div>

            {isMonthlyPackage && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs">Duração (meses)</Label>
                  <Input
                    type="number"
                    min="2"
                    max="12"
                    value={monthsTotal}
                    onChange={(e) => setMonthsTotal(e.target.value)}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">1ª mensalidade vence em</Label>
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="h-10 bg-background"
                  />
                </div>
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-sm font-medium text-primary">
                    {monthsTotal} meses x R$ {monthlyValue.toFixed(2)}/mês
                  </p>
                </div>
              </div>
            )}
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
          
          {status === 'pendente' && !isInstallment && !isMonthlyPackage && (
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
