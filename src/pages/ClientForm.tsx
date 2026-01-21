import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { capitalizeWords, formatPhone } from '@/lib/inputFormatters';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  
  const { clients, createClient, isCreating } = useClients();
  const { isAdmin, user } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editId);

  // Load editing client data
  useEffect(() => {
    if (editId) {
      loadClient();
    }
  }, [editId]);

  const loadClient = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', editId)
        .single();

      if (error) throw error;
      if (data) {
        setName(data.name);
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Erro ao carregar cliente');
      navigate('/clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/clientes');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from('clients')
          .update({
            name: name.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            notes: notes.trim() || null,
          })
          .eq('id', editId);

        if (error) throw error;
        toast.success('Cliente atualizado!');
      } else {
        await createClient({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        });
      }
      navigate('/clientes');
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Erro ao salvar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', editId);

      if (error) throw error;
      toast.success('Cliente excluído!');
      navigate('/clientes');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.message || 'Erro ao excluir cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim();
  const isEditing = !!editId;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center pb-8">
          <div className="w-full max-w-[720px] bg-card rounded-xl border border-border shadow-sm p-8">
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex justify-center pb-8">
        {/* Form Container */}
        <div className="w-full max-w-[720px] bg-card rounded-xl border border-border shadow-sm">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
            <h1 className="text-xl font-bold text-foreground">
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditing 
                ? 'Atualize os dados do cliente.'
                : 'Cadastre um cliente para organizar seus recebimentos.'}
            </p>
          </div>

          {/* Form Body */}
          <div className="p-5 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(capitalizeWords(e.target.value))}
                placeholder="Nome do cliente"
                className="h-11 max-w-md"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="h-11 max-w-[240px]"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="h-11 max-w-md"
              />
            </div>

            {/* Notes */}
            {isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações sobre o cliente..."
                  className="resize-none max-w-md min-h-[72px]"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-border flex items-center justify-between">
            {/* Delete button (left side, only for editing) */}
            <div>
              {isEditing && isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O cliente "{name}" será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Main actions (right side) */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={isSubmitting || isCreating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting || isCreating}
                loading={isSubmitting || isCreating}
                loadingText="Salvando..."
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
