import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServicesProducts } from '@/hooks/useServicesProducts';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useEntrySchedules, getDefaultDueDate } from '@/hooks/useEntrySchedules';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SmartValueInput from '@/components/ui/smart-value-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Check, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ServiceProductDrawer from '@/components/ServiceProductDrawer';
import BillingTypeSelector, { BillingType } from '@/components/entry/BillingTypeSelector';
import EntrySummary from '@/components/entry/EntrySummary';
import ItemSelector from '@/components/entry/ItemSelector';
import InstallmentOptions from '@/components/entry/InstallmentOptions';
import MonthlyPackageOptions from '@/components/entry/MonthlyPackageOptions';

type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro';
type PaymentStatus = 'pago' | 'pendente';
type ItemType = 'servico' | 'produto';

export default function NewEntry() {
  const navigate = useNavigate();
  const { user, accountId } = useAuth();
  const { requireSubscriptionForCreate } = useSubscriptionContext();
  const { clients, isLoading: clientsLoading } = useClients();
  const { items: servicesProducts, isLoading: itemsLoading } = useServicesProducts();
  const { createSchedules } = useEntrySchedules();
  
  // Form state
  const [clientId, setClientId] = useState('');
  const [itemType, setItemType] = useState<ItemType>('servico');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitValue, setUnitValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [status, setStatus] = useState<PaymentStatus>('pendente');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Billing type state (unified)
  const [billingType, setBillingType] = useState<BillingType>('single');
  const [dueDate, setDueDate] = useState(() => getDefaultDueDate(new Date().toISOString().split('T')[0]));
  const [installmentsTotal, setInstallmentsTotal] = useState('3');
  const [intervalDays, setIntervalDays] = useState('30');
  const [firstDueDate, setFirstDueDate] = useState(() => getDefaultDueDate(new Date().toISOString().split('T')[0]));
  const [monthsTotal, setMonthsTotal] = useState('3');

  // Service/Product drawer state
  const [isServiceProductDrawerOpen, setIsServiceProductDrawerOpen] = useState(false);
  const [pendingItemSelection, setPendingItemSelection] = useState<string | null>(null);

  // Validation state
  const [showValidation, setShowValidation] = useState(false);

  // Update default due date when entry date changes
  useEffect(() => {
    const newDueDate = getDefaultDueDate(date);
    setDueDate(newDueDate);
    setFirstDueDate(newDueDate);
  }, [date]);

  // Get selected item details
  const selectedItem = useMemo(() => {
    return servicesProducts.find(s => s.id === itemId);
  }, [servicesProducts, itemId]);

  // Get selected client name
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === clientId);
  }, [clients, clientId]);

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

  // Handle new service/product created from drawer
  const handleServiceProductDrawerClose = () => {
    setIsServiceProductDrawerOpen(false);
  };

  // Watch for new items to auto-select after creation
  useEffect(() => {
    if (pendingItemSelection && servicesProducts.length > 0) {
      const newItem = servicesProducts.find(item => item.name === pendingItemSelection);
      if (newItem) {
        setItemType(newItem.type);
        setTimeout(() => {
          handleItemChange(newItem.id);
        }, 100);
        setPendingItemSelection(null);
      }
    }
  }, [servicesProducts, pendingItemSelection]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!clientId) errors.push('Selecione um cliente');
    if (!itemId) errors.push('Selecione um item');
    if (totalValue <= 0) errors.push('Informe o valor');
    if (status === 'pendente' && billingType === 'single' && !dueDate) {
      errors.push('Vencimento obrigatório para pendente');
    }
    return errors;
  }, [clientId, itemId, totalValue, status, billingType, dueDate]);

  const isFormValid = validationErrors.length === 0;

  // Get effective due date for display
  const effectiveDueDate = useMemo(() => {
    if (billingType === 'single') {
      return dueDate;
    }
    return firstDueDate;
  }, [billingType, dueDate, firstDueDate]);

  // Get number of installments/months for summary
  const effectiveInstallments = useMemo(() => {
    if (billingType === 'installment') {
      return parseInt(installmentsTotal) || 1;
    }
    if (billingType === 'monthly_package') {
      return parseInt(monthsTotal) || 1;
    }
    return 1;
  }, [billingType, installmentsTotal, monthsTotal]);

  // Get value per period for summary
  const effectiveMonthlyValue = useMemo(() => {
    if (billingType === 'installment') {
      return installmentValue;
    }
    if (billingType === 'monthly_package') {
      return monthlyValue;
    }
    return undefined;
  }, [billingType, installmentValue, monthlyValue]);

  const handleSubmit = async (markAsPaid: boolean = false) => {
    setShowValidation(true);
    
    // Check subscription before allowing creation
    if (requireSubscriptionForCreate()) {
      return; // Modal will be shown by context
    }
    
    if (!user || !accountId) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!isFormValid) {
      toast.error(validationErrors[0]);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const finalStatus = markAsPaid ? 'pago' : status;
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate effective due date for single payments
      const entryDueDate = billingType === 'single' && finalStatus === 'pendente' ? dueDate : null;
      
      // Create the base transaction with account_id
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          client_id: clientId,
          service_product_id: itemId,
          quantity: parseInt(quantity) || 1,
          amount: totalValue,
          type: 'entrada',
          category: itemType === 'servico' ? 'servico' : 'produto',
          description: selectedItem?.name || null,
          payment_method: paymentMethod,
          status: finalStatus,
          date: date,
          due_date: entryDueDate,
          payment_date: finalStatus === 'pago' ? today : null,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create schedules if installment or monthly package
      if (billingType === 'installment' && finalStatus === 'pendente') {
        await createSchedules.mutateAsync({
          entry_id: transactionData.id,
          schedule_type: 'installment',
          total_value: totalValue,
          installments_total: parseInt(installmentsTotal) || 1,
          first_due_date: firstDueDate,
          interval_days: parseInt(intervalDays) || 30,
        });
      } else if (billingType === 'monthly_package' && finalStatus === 'pendente') {
        await createSchedules.mutateAsync({
          entry_id: transactionData.id,
          schedule_type: 'monthly_package',
          total_value: totalValue,
          installments_total: parseInt(monthsTotal) || 1,
          first_due_date: firstDueDate,
          interval_days: 30,
        });
      }

      toast.success('Lançamento criado com sucesso!');
      
      // Navigate with appropriate filter
      const targetFilter = finalStatus === 'pago' ? 'pago' : 'a_vencer';
      navigate(`/lancamentos?status=${targetFilter}`);
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
      <div className="flex justify-center pb-8">
        {/* Form Container */}
        <div className="w-full max-w-[720px] bg-card rounded-xl border border-border shadow-sm mx-4 my-4">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <h1 className="text-xl font-bold text-foreground">Novo Lançamento</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registre um atendimento, venda ou cobrança.
            </p>
          </div>

          {/* Form Body */}
          <div className="p-5 space-y-5">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-sm">Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId} disabled={isLoading}>
                <SelectTrigger className={cn(
                  "h-11 bg-background max-w-md",
                  showValidation && !clientId && "border-destructive"
                )}>
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

            {/* Item Section */}
            <ItemSelector
              itemType={itemType}
              setItemType={setItemType}
              itemId={itemId}
              onItemChange={handleItemChange}
              items={servicesProducts}
              isLoading={itemsLoading}
              onCreateNew={() => setIsServiceProductDrawerOpen(true)}
            />

            {/* Quantidade e Valor */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3 max-w-md">
              <h3 className="text-sm font-semibold text-foreground">Valores</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Quantidade {itemType === 'produto' && '*'}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-11 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor unit. (R$) *</Label>
                  <SmartValueInput
                    value={unitValue}
                    onChange={setUnitValue}
                    placeholder="0,00"
                    className={cn(
                      showValidation && !unitValue && "border-destructive"
                    )}
                  />
                </div>
              </div>

              {/* Total */}
              <div className="bg-background rounded-lg p-3 border border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    R$ {totalValue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Forma de pagamento */}
            <div className="space-y-1.5">
              <Label className="text-sm">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-11 bg-background max-w-[240px]">
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
            <div className="space-y-1.5">
              <Label className="text-sm">Status</Label>
              <div className="inline-flex bg-secondary rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setStatus('pendente')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    status === 'pendente'
                      ? 'bg-warning text-warning-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Pendente
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pago')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    status === 'pago'
                      ? 'bg-success text-success-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Pago
                </button>
              </div>
            </div>

            {/* Data do Lançamento */}
            <div className="space-y-1.5">
              <Label className="text-sm">Data do lançamento</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 bg-background max-w-[200px]"
              />
            </div>

            {/* Billing Type Section - Only for pending status */}
            {status === 'pendente' && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-3 max-w-md">
                <h3 className="text-sm font-semibold text-foreground">Tipo de cobrança</h3>
                
                <BillingTypeSelector
                  value={billingType}
                  onChange={setBillingType}
                />
                
                {/* Single payment due date */}
                {billingType === 'single' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground">Vencimento</Label>
                    </div>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-11 bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Padrão: 30 dias após a data do lançamento
                    </p>
                  </div>
                )}
                
                {/* Installment options */}
                {billingType === 'installment' && (
                  <InstallmentOptions
                    installmentsTotal={installmentsTotal}
                    setInstallmentsTotal={setInstallmentsTotal}
                    intervalDays={intervalDays}
                    setIntervalDays={setIntervalDays}
                    firstDueDate={firstDueDate}
                    setFirstDueDate={setFirstDueDate}
                    installmentValue={installmentValue}
                  />
                )}
                
                {/* Monthly package options */}
                {billingType === 'monthly_package' && (
                  <MonthlyPackageOptions
                    monthsTotal={monthsTotal}
                    setMonthsTotal={setMonthsTotal}
                    firstDueDate={firstDueDate}
                    setFirstDueDate={setFirstDueDate}
                    monthlyValue={monthlyValue}
                  />
                )}
              </div>
            )}

            {/* Summary - Show when form has minimum data */}
            {(clientId || itemId) && totalValue > 0 && (
              <EntrySummary
                clientName={selectedClient?.name}
                itemName={selectedItem?.name}
                itemType={selectedItem?.type}
                totalValue={totalValue}
                billingType={billingType}
                installments={effectiveInstallments}
                monthlyValue={effectiveMonthlyValue}
                firstDueDate={effectiveDueDate}
                status={status}
              />
            )}

            {/* Validation Errors */}
            {showValidation && validationErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <p key={index} className="text-sm text-destructive">{error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-border flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            
            {status === 'pendente' && billingType === 'single' && (
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                className="border-success text-success hover:bg-success hover:text-success-foreground"
                disabled={isSubmitting}
              >
                <Check className="mr-2 h-4 w-4" />
                Salvar como pago
              </Button>
            )}
            
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
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
          </div>
        </div>
      </div>

      {/* Service/Product Creation Drawer */}
      <ServiceProductDrawer
        open={isServiceProductDrawerOpen}
        onClose={handleServiceProductDrawerClose}
        editingItem={null}
        onItemCreated={(itemName) => setPendingItemSelection(itemName)}
      />
    </div>
  );
}
