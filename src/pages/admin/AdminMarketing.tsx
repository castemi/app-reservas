import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Send, Trash2, X } from 'lucide-react';

export default function AdminMarketing() {
  const queryClient = useQueryClient();

  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipo, setTipo] = useState<'inmediata' | 'programada' | 'automatizada'>('inmediata');
  const [target, setTarget] = useState('todos');
  const [fechaProgramada, setFechaProgramada] = useState<Date>();
  const [horaProgramada, setHoraProgramada] = useState('10:00');
  const [diasPostCita, setDiasPostCita] = useState(30);
  const [sending, setSending] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email')
        .order('nombre');
      if (error) throw error;
      return data;
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: emailCount } = useQuery({
    queryKey: ['email-subscriber-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const handleSend = async () => {
    if (!asunto.trim() || !mensaje.trim()) {
      toast({ title: 'Completa asunto y mensaje', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      if (tipo === 'inmediata') {
        const { data: campaign, error: insertError } = await supabase
          .from('email_campaigns')
          .insert({ asunto, mensaje, tipo: 'inmediata', target, estado: 'pendiente' })
          .select()
          .single();
        if (insertError) throw insertError;

        const { error: fnError } = await supabase.functions.invoke('send-email-campaign', {
          body: { campaign_id: campaign.id },
        });
        if (fnError) throw fnError;

        toast({ title: 'Email enviado' });
      } else if (tipo === 'programada') {
        if (!fechaProgramada) {
          toast({ title: 'Selecciona una fecha', variant: 'destructive' });
          setSending(false);
          return;
        }
        const [h, m] = horaProgramada.split(':').map(Number);
        const scheduled = new Date(fechaProgramada);
        scheduled.setHours(h, m, 0, 0);

        const { error } = await supabase.from('email_campaigns').insert({
          asunto,
          mensaje,
          tipo: 'programada',
          target,
          fecha_programada: scheduled.toISOString(),
          estado: 'pendiente',
        });
        if (error) throw error;
        toast({ title: 'Campaña programada' });
      } else {
        const { error } = await supabase.from('email_campaigns').insert({
          asunto,
          mensaje,
          tipo: 'automatizada',
          target: 'todos',
          dias_post_cita: diasPostCita,
          estado: 'pendiente',
        });
        if (error) throw error;
        toast({ title: 'Regla automática creada' });
      }

      setAsunto('');
      setMensaje('');
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const cancelCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_campaigns')
        .update({ estado: 'cancelada' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast({ title: 'Campaña cancelada' });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast({ title: 'Campaña eliminada' });
    },
  });

  const getTargetLabel = (t: string) => {
    if (t === 'todos') return 'Todos';
    const p = profiles?.find((pr) => pr.id === t);
    return p?.nombre || p?.email || t.slice(0, 8);
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendiente</Badge>;
      case 'enviada':
        return <Badge className="bg-green-600">Enviada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Stats */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{emailCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Contactos con email</p>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {campaigns?.filter((c) => c.estado === 'pendiente').length ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* New Campaign Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva Campaña de Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Público objetivo</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los clientes</SelectItem>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre || p.email || p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Asunto</Label>
            <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej: ¡Te echamos de menos!" />
          </div>
          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej: Hace tiempo que no te pasas, ¡reserva ya!" rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Cuándo enviar</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inmediata">Ahora mismo</SelectItem>
                <SelectItem value="programada">Día señalado</SelectItem>
                <SelectItem value="automatizada">Recordatorio automático</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === 'programada' && (
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaProgramada ? format(fechaProgramada, 'PPP', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={fechaProgramada}
                      onSelect={setFechaProgramada}
                      disabled={(d) => d < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-28 space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={horaProgramada} onChange={(e) => setHoraProgramada(e.target.value)} />
              </div>
            </div>
          )}

          {tipo === 'automatizada' && (
            <div className="space-y-2">
              <Label>Enviar X días después de última cita completada</Label>
              <Input
                type="number"
                min={1}
                value={diasPostCita}
                onChange={(e) => setDiasPostCita(Number(e.target.value))}
              />
            </div>
          )}

          <Button onClick={handleSend} disabled={sending} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {tipo === 'inmediata' ? 'Enviar ahora' : tipo === 'programada' ? 'Programar' : 'Crear regla'}
          </Button>
        </CardContent>
      </Card>

      {/* Campaign History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Campañas</CardTitle>
        </CardHeader>
        <CardContent>
          {!campaigns?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin campañas aún</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.asunto}</p>
                        <p className="text-xs text-muted-foreground">{getTargetLabel(c.target)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs capitalize">{c.tipo}</span>
                      {c.tipo === 'programada' && c.fecha_programada && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(c.fecha_programada), 'dd/MM HH:mm')}
                        </p>
                      )}
                      {c.tipo === 'automatizada' && c.dias_post_cita && (
                        <p className="text-xs text-muted-foreground">{c.dias_post_cita} días</p>
                      )}
                    </TableCell>
                    <TableCell>{estadoBadge(c.estado)}</TableCell>
                    <TableCell className="text-right">
                      {c.estado === 'pendiente' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelCampaign.mutate(c.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCampaign.mutate(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
