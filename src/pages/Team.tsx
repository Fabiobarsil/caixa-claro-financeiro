import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, UserPlus, Users, Shield, Loader2, Trash2 } from 'lucide-react';

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador';
}

export default function Team() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '' });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
    
    if (isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchTeamMembers = async () => {
    try {
      // Fetch profiles with roles using a join-like approach
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const teamData: TeamMember[] = (profiles || []).map(profile => {
        const roleData = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (roleData?.role as 'admin' | 'operador') || 'operador'
        };
      });

      setMembers(teamData);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('Erro ao carregar equipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-operator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          name: newMember.name.trim(),
          email: newMember.email.trim().toLowerCase(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao convidar operador');
      }

      toast.success('Convite enviado! O operador receberá um email para definir a senha.');
      setNewMember({ name: '', email: '' });
      setIsDialogOpen(false);
      
      // Refresh team list after a short delay to allow trigger to complete
      setTimeout(fetchTeamMembers, 1000);
    } catch (error: any) {
      console.error('Error inviting operator:', error);
      toast.error(error.message || 'Erro ao convidar operador');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!isAdmin && !authLoading)) {
    return (
      <AppLayout showFab={false}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showFab={false}>
      <div className="px-4 pt-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/configuracoes')}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Equipe</h1>
        </div>

        {/* Add Operator Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl mb-6 hover:bg-primary/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <UserPlus size={20} className="text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Adicionar operador</p>
                <p className="text-sm text-muted-foreground">Convidar novo membro</p>
              </div>
              <Plus size={20} className="ml-auto text-primary" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Convidar Operador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInviteOperator} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Nome do operador"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                O operador receberá um email para definir sua senha e acessar o sistema.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar convite'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Team List */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {members.length} membro{members.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum membro cadastrado
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border"
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                  <Shield size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{member.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  member.role === 'admin' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {member.role === 'admin' ? 'Admin' : 'Operador'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
