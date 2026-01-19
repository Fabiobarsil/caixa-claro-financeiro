import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ClientWithStats {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  totalPaid: number;
  totalEntries: number;
}

interface CreateClientData {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export function useClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<ClientWithStats[]> => {
      // Fetch clients
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch entries to calculate stats
      const { data: entries } = await supabase
        .from('entries')
        .select('client_id, value, status');

      const clientStats = (clients || []).map(client => {
        const clientEntries = (entries || []).filter(e => e.client_id === client.id);
        const paidEntries = clientEntries.filter(e => e.status === 'pago');
        
        return {
          ...client,
          totalPaid: paidEntries.reduce((sum, e) => sum + Number(e.value), 0),
          totalEntries: clientEntries.length,
        };
      });

      return clientStats;
    },
    enabled: !!user,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: CreateClientData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      toast.error('Erro ao cadastrar cliente');
    },
  });

  return {
    clients: clientsQuery.data || [],
    isLoading: clientsQuery.isLoading,
    error: clientsQuery.error,
    createClient: createClientMutation.mutate,
    isCreating: createClientMutation.isPending,
  };
}
