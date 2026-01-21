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
      const { data, error } = await supabase
        .from('services_products')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        base_price: item.base_price ?? 0,
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
          base_price: input.base_price,
          cost: input.cost ?? 0,
          notes: input.notes,
        })
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
          base_price: input.base_price,
          cost: input.cost ?? 0,
          notes: input.notes,
        })
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
