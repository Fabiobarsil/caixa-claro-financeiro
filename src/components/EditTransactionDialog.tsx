import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    client_name?: string;
    item_name?: string;
    description?: string | null;
    amount: number;
    date: string;
    due_date?: string | null;
    notes?: string | null;
  } | null;
}

export default function EditTransactionDialog({ open, onOpenChange, transaction }: EditTransactionDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toFixed(2));
      setDate(transaction.date);
      setDueDate(transaction.due_date || '');
      setDescription(transaction.description || transaction.item_name || '');
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Valor inválido');
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        amount: parsedAmount,
        date,
        description,
        notes: notes || null,
      };
      if (dueDate) updates.due_date = dueDate;

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transaction.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cobrancas'] });
      toast.success('Lançamento atualizado!');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao atualizar:', err);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lançamento</DialogTitle>
          <DialogDescription>
            {transaction?.client_name} — {transaction?.item_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrição do item"
            />
          </div>
          <div>
            <Label htmlFor="edit-amount">Valor (R$)</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-due-date">Vencimento</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-notes">Observações</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas opcionais"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} loadingText="Salvando...">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
