import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { capitalizeWords } from '@/lib/inputFormatters';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ArrowLeft, Plus, UserPlus, Users, Shield, Loader2, MoreVertical, UserX, Palmtree, UserCheck, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador';
  is_active: boolean;
  vacation_start: string | null;
  vacation_end: string | null;
}

type MemberStatus = 'active' | 'inactive' | 'vacation';

function getMemberStatus(member: TeamMember): MemberStatus {
  if (!member.is_active) return 'inactive';
  
  if (member.vacation_start && member.vacation_end) {
    const now = new Date();
    const start = parseISO(member.vacation_start);
    const end = parseISO(member.vacation_end);
    
    if (isWithinInterval(now, { start, end }) || 
        (isBefore(now, end) && isAfter(now, start))) {
      return 'vacation';
    }
  }
  
  return 'active';
}

function getStatusBadge(status: MemberStatus, vacationEnd?: string | null) {
  switch (status) {
    case 'inactive':
      return {
        label: 'Desativado',
        className: 'bg-destructive/10 text-destructive',
        icon: UserX
      };
    case 'vacation':
      return {
        label: vacationEnd 
          ? `Férias até ${format(parseISO(vacationEnd), 'dd/MM')}` 
          : 'Em férias',
        className: 'bg-warning/10 text-warning',
        icon: Palmtree
      };
    default:
      return {
        label: 'Ativo',
        className: 'bg-success/10 text-success',
        icon: UserCheck
      };
  }
}

export default function Team() {
  const { isAdmin, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '' });
  
  // States for actions
  const [confirmAction, setConfirmAction] = useState<{ type: 'deactivate' | 'activate'; member: TeamMember } | null>(null);
  const [vacationDialog, setVacationDialog] = useState<TeamMember | null>(null);
  const [vacationDates, setVacationDates] = useState({ start: '', end: '' });

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
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, is_active, vacation_start, vacation_end');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const teamData: TeamMember[] = (profiles || []).map(profile => {
        const roleData = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (roleData?.role as 'admin' | 'operador') || 'operador',
          is_active: profile.is_active ?? true,
          vacation_start: profile.vacation_start,
          vacation_end: profile.vacation_end,
        };
      });

      // Sort: active first, then vacation, then inactive
      teamData.sort((a, b) => {
        const statusOrder = { active: 0, vacation: 1, inactive: 2 };
        return statusOrder[getMemberStatus(a)] - statusOrder[getMemberStatus(b)];
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
      
      setTimeout(fetchTeamMembers, 1000);
    } catch (error: any) {
      console.error('Error inviting operator:', error);
      toast.error(error.message || 'Erro ao convidar operador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmAction) return;
    
    const { type, member } = confirmAction;
    const newStatus = type === 'activate';

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: newStatus,
          // Clear vacation when reactivating
          ...(newStatus && { vacation_start: null, vacation_end: null })
        })
        .eq('user_id', member.user_id);

      if (error) throw error;

      toast.success(newStatus ? 'Usuário reativado!' : 'Usuário desativado!');
      setConfirmAction(null);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetVacation = async () => {
    if (!vacationDialog) return;
    
    if (!vacationDates.start || !vacationDates.end) {
      toast.error('Informe as datas de início e fim');
      return;
    }

    if (vacationDates.start > vacationDates.end) {
      toast.error('Data de início deve ser anterior à data de fim');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          vacation_start: vacationDates.start,
          vacation_end: vacationDates.end,
        })
        .eq('user_id', vacationDialog.user_id);

      if (error) throw error;

      toast.success('Férias configuradas!');
      setVacationDialog(null);
      setVacationDates({ start: '', end: '' });
      fetchTeamMembers();
    } catch (error) {
      console.error('Error setting vacation:', error);
      toast.error('Erro ao configurar férias');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearVacation = async (member: TeamMember) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ vacation_start: null, vacation_end: null })
        .eq('user_id', member.user_id);

      if (error) throw error;

      toast.success('Férias removidas!');
      fetchTeamMembers();
    } catch (error) {
      console.error('Error clearing vacation:', error);
      toast.error('Erro ao remover férias');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openVacationDialog = (member: TeamMember) => {
    setVacationDialog(member);
    setVacationDates({
      start: member.vacation_start || '',
      end: member.vacation_end || '',
    });
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
          <DialogContent className="sm:max-w-[480px] p-0">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Convidar Operador</h2>
              <p className="text-sm text-muted-foreground mt-1">
                O operador receberá um email para definir sua senha.
              </p>
            </div>
            <form onSubmit={handleInviteOperator} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do operador"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: capitalizeWords(e.target.value) })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
            </form>
            <div className="p-5 border-t border-border flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleInviteOperator as any}
                disabled={isSubmitting}
              >
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
            members.map((member) => {
              const status = getMemberStatus(member);
              const statusBadge = getStatusBadge(status, member.vacation_end);
              const StatusIcon = statusBadge.icon;
              const isCurrentUser = member.user_id === user?.id;

              return (
                <div
                  key={member.user_id}
                  className={cn(
                    "flex items-center gap-3 p-4 bg-card rounded-xl border border-border",
                    status === 'inactive' && "opacity-60"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    status === 'active' && "bg-secondary text-muted-foreground",
                    status === 'vacation' && "bg-warning/20 text-warning",
                    status === 'inactive' && "bg-destructive/20 text-destructive"
                  )}>
                    <Shield size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {member.name}
                      {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(você)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1',
                        statusBadge.className
                      )}>
                        <StatusIcon size={12} />
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Role Badge */}
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    member.role === 'admin' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-secondary text-muted-foreground'
                  )}>
                    {member.role === 'admin' ? 'Admin' : 'Operador'}
                  </span>

                  {/* Actions Menu - only for non-current user */}
                  {!isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.is_active ? (
                          <>
                            <DropdownMenuItem onClick={() => openVacationDialog(member)}>
                              <Palmtree size={16} className="mr-2" />
                              {member.vacation_start ? 'Editar férias' : 'Configurar férias'}
                            </DropdownMenuItem>
                            {member.vacation_start && (
                              <DropdownMenuItem onClick={() => handleClearVacation(member)}>
                                <Calendar size={16} className="mr-2" />
                                Remover férias
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setConfirmAction({ type: 'deactivate', member })}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserX size={16} className="mr-2" />
                              Desativar usuário
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem onClick={() => setConfirmAction({ type: 'activate', member })}>
                            <UserCheck size={16} className="mr-2" />
                            Reativar usuário
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirm Deactivate/Activate Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'deactivate' ? 'Desativar usuário?' : 'Reativar usuário?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'deactivate' 
                ? `O usuário "${confirmAction?.member.name}" não poderá mais acessar o sistema. Você pode reativá-lo depois.`
                : `O usuário "${confirmAction?.member.name}" poderá acessar o sistema novamente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleActive} 
              disabled={isSubmitting}
              className={confirmAction?.type === 'deactivate' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                confirmAction?.type === 'deactivate' ? 'Desativar' : 'Reativar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vacation Dialog */}
      <Dialog open={!!vacationDialog} onOpenChange={() => setVacationDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palmtree size={20} className="text-warning" />
              Configurar férias
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Configure o período de férias para <strong>{vacationDialog?.name}</strong>. 
              Durante este período, o usuário será exibido como "Em férias".
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vacation_start">Data início</Label>
                <Input
                  id="vacation_start"
                  type="date"
                  value={vacationDates.start}
                  onChange={(e) => setVacationDates({ ...vacationDates, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vacation_end">Data fim</Label>
                <Input
                  id="vacation_end"
                  type="date"
                  value={vacationDates.end}
                  onChange={(e) => setVacationDates({ ...vacationDates, end: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVacationDialog(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSetVacation} 
                disabled={isSubmitting || !vacationDates.start || !vacationDates.end}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
