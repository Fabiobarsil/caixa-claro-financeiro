import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { capitalizeWords, formatPhone } from '@/lib/inputFormatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

interface QuickClientDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (clientId: string) => void;
}

export default function QuickClientDrawer({
  open,
  onOpenChange,
  onClientCreated,
}: QuickClientDrawerProps) {
  const { createClient, isCreating } = useClients();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }

    try {
      const newClient = await createClient({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      
      if (newClient) {
        onClientCreated(newClient.id);
      }
      
      // Reset and close
      setName('');
      setPhone('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      toast.error(error.message || 'Erro ao criar cliente');
    }
  };

  const handleClose = () => {
    setName('');
    setPhone('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Novo Cliente</SheetTitle>
          <SheetDescription>
            Cadastro rápido para vincular ao lançamento.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="quick-client-name" className="text-sm">Nome *</Label>
            <Input
              id="quick-client-name"
              value={name}
              onChange={(e) => setName(capitalizeWords(e.target.value))}
              placeholder="Nome do cliente"
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-client-phone" className="text-sm">Telefone / WhatsApp</Label>
            <Input
              id="quick-client-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="h-11"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || isCreating}
              loading={isCreating}
              loadingText="Salvando..."
              className="flex-1"
            >
              Salvar e Selecionar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
