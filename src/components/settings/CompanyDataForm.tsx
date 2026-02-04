import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Phone, CreditCard, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyData {
  company_name: string;
  phone: string;
  cpf: string;
}

export default function CompanyDataForm() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<CompanyData>({
    company_name: '',
    phone: '',
    cpf: ''
  });

  useEffect(() => {
    if (user?.id && isOpen) {
      loadCompanyData();
    }
  }, [user?.id, isOpen]);

  const loadCompanyData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_name, phone, cpf')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading company data:', error);
        return;
      }

      if (profile) {
        setData({
          company_name: profile.company_name || '',
          phone: profile.phone || '',
          cpf: profile.cpf || ''
        });
      }
    } catch (error) {
      console.error('Error in loadCompanyData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: data.company_name || null,
          phone: data.phone || null,
          cpf: data.cpf || null
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving company data:', error);
        toast.error(`Erro ao salvar: ${error.message}`);
        return;
      }

      toast.success('Dados salvos com sucesso');
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Building2 size={20} />
          </div>
          <div>
            <p className="font-medium text-foreground">Dados da empresa</p>
            <p className="text-sm text-muted-foreground">Opcional</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={20} className="text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Nome da empresa
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={data.company_name}
                    onChange={(e) => setData({ ...data, company_name: e.target.value })}
                    placeholder="Ex: Minha Empresa LTDA"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={data.phone}
                    onChange={(e) => setData({ ...data, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  CPF
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={data.cpf}
                    onChange={(e) => setData({ ...data, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
