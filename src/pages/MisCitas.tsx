import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { CalendarDays, Clock } from 'lucide-react';

type Appointment = {
  id: string;
  fecha_hora: string;
  estado: 'programada' | 'completada' | 'cancelada';
  services: { nombre: string; duracion_minutos: number; precio: number };
};

export default function MisCitas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['my_appointments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, fecha_hora, estado, services(nombre, duracion_minutos, precio)')
        .eq('client_id', user!.id)
        .order('fecha_hora', { ascending: false });
      if (error) throw error;
      return data as Appointment[];
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').update({ estado: 'cancelada' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_appointments'] });
      toast({ title: 'Cita anulada', description: 'La cita ha sido cancelada correctamente.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo anular la cita.', variant: 'destructive' });
    },
  });

  const upcoming = appointments?.filter((a) => a.estado === 'programada' && !isPast(new Date(a.fecha_hora))) || [];
  const history = appointments?.filter((a) => a.estado !== 'programada' || isPast(new Date(a.fecha_hora))) || [];

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada': return <Badge className="bg-accent text-accent-foreground">Completada</Badge>;
      case 'cancelada': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge variant="secondary">Programada</Badge>;
    }
  };

  const AppointmentCard = ({ appt, showCancel }: { appt: Appointment; showCancel?: boolean }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{appt.services.nombre}</p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(new Date(appt.fecha_hora), "d MMM yyyy", { locale: es })}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(appt.fecha_hora), 'HH:mm')}
            </div>
            <p className="text-sm font-medium text-accent">{Number(appt.services.precio).toFixed(2)} €</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {estadoBadge(appt.estado)}
            {showCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">Anular</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Anular cita?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se cancelará tu cita de {appt.services.nombre} el {format(new Date(appt.fecha_hora), "d 'de' MMMM 'a las' HH:mm", { locale: es })}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => cancelMutation.mutate(appt.id)}
                    >
                      Sí, anular
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Mis Citas" />

      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <Tabs defaultValue="proximas">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="proximas">Próximas</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="proximas" className="space-y-3 pt-4">
              {upcoming.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No tienes citas próximas</p>
              ) : (
                upcoming.map((a) => <AppointmentCard key={a.id} appt={a} showCancel />)
              )}
            </TabsContent>

            <TabsContent value="historial" className="space-y-3 pt-4">
              {history.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No tienes citas en el historial</p>
              ) : (
                history.map((a) => <AppointmentCard key={a.id} appt={a} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
