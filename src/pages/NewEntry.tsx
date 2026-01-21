import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServicesProducts } from '@/hooks/useServicesProducts';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { useEntrySchedules, getDefaultDueDate } from '@/hooks/useEntrySchedules';
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
  const { user } = useAuth();
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
    
    if (!user) {
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
          due_date: entryDueDate,
          payment_date: finalStatus === 'pago' ? today : null,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create schedules if installment or monthly package
      if (billingType === 'installment' && finalStatus === 'pendente') {
        await createSchedules.mutateAsync({
          entry_id: entryData.id,
          schedule_type: 'installment',
          total_value: totalValue,
          installments_total: parseInt(installmentsTotal) || 1,
          first_due_date: firstDueDate,
          interval_days: parseInt(intervalDays) || 30,
        });
      } else if (billingType === 'monthly_package' && finalStatus === 'pendente') {
        await createSchedules.mutateAsync({
          entry_id: entryData.id,
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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-colors"
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
            <SelectTrigger className={cn(
              "h-12 bg-card",
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
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Valores</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Quantidade - mostra mais destaque para produtos */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Quantidade {itemType === 'produto' && '*'}
              </Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Valor unit. (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                className={cn(
                  "h-12 bg-background",
                  showValidation && !unitValue && "border-destructive"
                )}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Total */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                R$ {totalValue.toFixed(2)}
              </span>
            </div>
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
              type="button"
              onClick={() => setStatus('pendente')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                status === 'pendente'
                  ? 'bg-warning text-warning-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              Pendente
            </button>
            <button
              type="button"
              onClick={() => setStatus('pago')}
              className={cn(
                'flex-1 py-3 rounded-lg font-medium transition-colors',
                status === 'pago'
                  ? 'bg-success text-success-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
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

        {/* Billing Type Section - Only for pending status */}
        {status === 'pendente' && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Tipo de cobrança</h3>
            
            <BillingTypeSelector
              value={billingType}
              onChange={setBillingType}
            />
            
            {/* Single payment due date */}
            {billingType === 'single' && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
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

        {/* Actions */}
        <div className="pt-4 space-y-3 pb-8">
          <Button
            onClick={() => handleSubmit(false)}
            className="w-full h-12 text-base font-semibold"
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
          
          {status === 'pendente' && billingType === 'single' && (
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              className="w-full h-12 text-base font-semibold border-success text-success hover:bg-success hover:text-success-foreground"
              disabled={isSubmitting}
            >
              <Check className="mr-2 h-4 w-4" />
              Salvar e marcar como pago
            </Button>
          )}
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
