import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Activity, RefreshCw, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppLayout from '@/components/AppLayout';

interface Subscriber {
  id: string;
  email: string;
  name: string;
  subscription_status: string;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_expiration_date: string | null;
}

interface WebhookRequest {
  id: string;
  created_at: string;
  status_code: number;
  reason: string | null;
  raw_body: string | null;
}

interface WebhookEvent {
  id: string;
  created_at: string;
  email: string;
  raw_event: string;
  normalized_event: string;
  normalized_plan: string | null;
  subscription_status_applied: string;
  success: boolean;
  error_message: string | null;
}

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [webhookRequests, setWebhookRequests] = useState<WebhookRequest[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulator state
  const [simEmail, setSimEmail] = useState('');
  const [simEvent, setSimEvent] = useState('');
  const [simProduct, setSimProduct] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch subscribers
      const { data: subs, error: subsError } = await supabase
        .from('profiles')
        .select('id, email, name, subscription_status, subscription_plan, subscription_start_date, subscription_expiration_date')
        .order('subscription_start_date', { ascending: false, nullsFirst: false });

      if (subsError) throw subsError;
      setSubscribers(subs || []);

      // Fetch webhook requests
      const { data: requests, error: reqError } = await supabase
        .from('webhook_requests')
        .select('id, created_at, status_code, reason, raw_body')
        .order('created_at', { ascending: false })
        .limit(20);

      if (reqError) throw reqError;
      setWebhookRequests(requests || []);

      // Fetch webhook events
      const { data: events, error: eventsError } = await supabase
        .from('webhook_events')
        .select('id, created_at, email, raw_event, normalized_event, normalized_plan, subscription_status_applied, success, error_message')
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;
      setWebhookEvents(events || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      toast({
        title: 'Erro ao carregar dados',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const simulateWebhook = async () => {
    if (!simEmail || !simEvent || !simProduct) {
      toast({
        title: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('kiwify-webhook', {
        body: {
          email: simEmail,
          evento: simEvent,
          produto: simProduct,
          token: 'SIMULATION_FROM_ADMIN', // Will be validated by the function
        },
      });

      if (error) throw error;

      toast({
        title: 'Webhook simulado',
        description: `Resultado: ${data?.message || 'Processado'}`,
      });

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Simulation error:', err);
      toast({
        title: 'Erro na simulação',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      ativo: { variant: 'default', label: 'Ativo' },
      active: { variant: 'default', label: 'Ativo' },
      pendente: { variant: 'secondary', label: 'Pendente' },
      em_atraso: { variant: 'destructive', label: 'Em Atraso' },
      cancelado: { variant: 'outline', label: 'Cancelado' },
      expirado: { variant: 'outline', label: 'Expirado' },
      inactive: { variant: 'outline', label: 'Inativo' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatTimeAgo = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  return (
    <AppLayout>
      <div className="container py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gestão de Assinaturas</h1>
              <p className="text-muted-foreground">Gerencie assinantes e monitore webhooks</p>
            </div>
          </div>
          <Button onClick={fetchData} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="subscribers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subscribers">
              <Users className="h-4 w-4 mr-2" />
              Assinantes
            </TabsTrigger>
            <TabsTrigger value="requests">
              <FileText className="h-4 w-4 mr-2" />
              Requisições
            </TabsTrigger>
            <TabsTrigger value="events">
              <Activity className="h-4 w-4 mr-2" />
              Eventos
            </TabsTrigger>
            <TabsTrigger value="simulator">
              <Send className="h-4 w-4 mr-2" />
              Simulador
            </TabsTrigger>
          </TabsList>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Assinantes</CardTitle>
                <CardDescription>
                  Todos os usuários e seus status de assinatura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Expira</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono text-sm">{sub.email}</TableCell>
                        <TableCell>{sub.name}</TableCell>
                        <TableCell>
                          {sub.subscription_plan ? (
                            <Badge variant="secondary">{sub.subscription_plan}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.subscription_status || 'inactive')}</TableCell>
                        <TableCell>{formatDate(sub.subscription_start_date)}</TableCell>
                        <TableCell>{formatDate(sub.subscription_expiration_date)}</TableCell>
                      </TableRow>
                    ))}
                    {subscribers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum assinante encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Últimas Requisições</CardTitle>
                <CardDescription>
                  Histórico de todas as requisições recebidas (incluindo falhas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm">{formatTimeAgo(req.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={req.status_code < 400 ? 'default' : 'destructive'}>
                            {req.status_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {req.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {webhookRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nenhuma requisição registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Eventos Processados</CardTitle>
                <CardDescription>
                  Histórico de eventos que foram processados pelo webhook
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status Aplicado</TableHead>
                      <TableHead>Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm">{formatTimeAgo(event.created_at)}</TableCell>
                        <TableCell className="font-mono text-sm">{event.email}</TableCell>
                        <TableCell className="text-sm">{event.raw_event}</TableCell>
                        <TableCell>
                          {event.normalized_plan && (
                            <Badge variant="secondary">{event.normalized_plan}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(event.subscription_status_applied)}</TableCell>
                        <TableCell>
                          {event.success ? (
                            <Badge variant="default">Sucesso</Badge>
                          ) : (
                            <Badge variant="destructive" title={event.error_message || ''}>
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {webhookEvents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum evento processado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simulator Tab */}
          <TabsContent value="simulator">
            <Card>
              <CardHeader>
                <CardTitle>Simulador de Webhook</CardTitle>
                <CardDescription>
                  Simule eventos do Kiwify para testar o fluxo de assinatura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email do Cliente</label>
                    <Input
                      type="email"
                      placeholder="cliente@exemplo.com"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Evento</label>
                    <Select value={simEvent} onValueChange={setSimEvent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o evento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compra aprovada">Compra Aprovada</SelectItem>
                        <SelectItem value="assinatura renovada">Assinatura Renovada</SelectItem>
                        <SelectItem value="pagamento aprovado">Pagamento Aprovado</SelectItem>
                        <SelectItem value="assinatura cancelada">Assinatura Cancelada</SelectItem>
                        <SelectItem value="chargeback">Chargeback</SelectItem>
                        <SelectItem value="assinatura atrasada">Assinatura Atrasada</SelectItem>
                        <SelectItem value="pix gerado">PIX Gerado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Produto</label>
                    <Select value={simProduct} onValueChange={setSimProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Plano Mensal">Plano Mensal</SelectItem>
                        <SelectItem value="Plano Semestral">Plano Semestral</SelectItem>
                        <SelectItem value="Plano Anual">Plano Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={simulateWebhook} disabled={isSimulating}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSimulating ? 'Simulando...' : 'Simular Webhook'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
