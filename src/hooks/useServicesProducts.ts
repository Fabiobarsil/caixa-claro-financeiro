import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ItemType = 'servico' | 'produto';

export interface ServiceProduct {
  id: string;
  user_id: string;
  type: ItemType;
  name: string;
  base_price: number;
  cost: number;
  stock_quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceProductInput {
  type: ItemType;
  name: string;
  base_price: number;
  cost?: number;
  stock_quantity?: number;
  notes?: string;
}

export function useServicesProducts() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['services_products'],
    queryFn: async () => {
      // Use any to bypass type issue since we renamed price to base_price
      const { data, error } = await supabase
        .from('services_products')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Map price to base_price for compatibility
      return (data || []).map((item: any) => ({
        ...item,
        base_price: item.base_price ?? item.price ?? 0,
        cost: item.cost ?? 0,
        stock_quantity: item.stock_quantity ?? 0,
      })) as ServiceProduct[];
    },
    enabled: !!user,
  });

  const createItem = useMutation({
    mutationFn: async (input: ServiceProductInput) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('services_products')
        .insert({
          user_id: user.id,
          type: input.type,
          name: input.name,
          // Use price since that's what the DB type expects
          price: input.base_price,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services_products'] });
      toast.success('Item criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar item:', error);
      toast.error('Erro ao criar item: ' + error.message);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...input }: ServiceProductInput & { id: string }) => {
      const { data, error } = await supabase
        .from('services_products')
        .update({
          type: input.type,
          name: input.name,
          price: input.base_price,
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services_products'] });
      toast.success('Item atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar item:', error);
      toast.error('Erro ao atualizar item: ' + error.message);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) throw new Error('Apenas administradores podem excluir itens');
      
      const { error } = await supabase
        .from('services_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services_products'] });
      toast.success('Item excluído com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir item:', error);
      toast.error('Erro ao excluir item: ' + error.message);
    },
  });

  return {
    items,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
    isAdmin,
  };
}
