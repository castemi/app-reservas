import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, setHours, setMinutes, addMinutes, isBefore, isEqual } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Plus, Clock, DollarSign, User, Scissors, CalendarDays, X } from 'lucide-react';

const PX_PER_MINUTE = 2;

type DaySchedule = {
  id: string;
  day_of_week: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
};

type AdminAppointment = {
  id: string;
  fecha_hora: string;
  estado: string;
  client_id: string;
  service_id: string;
  profiles: { nombre: string | null; email: string | null } | null;
  services: { nombre: string; duracion_minutos: number; precio: number } | null;
};

export default function AdminAgenda() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AdminAppointment | null>(null);
  const [newTime, setNewTime] = useState<string | null>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();

  // Fetch day_schedules for the selected day
  const { data: dayShifts } = useQuery({
    queryKey: ['day_schedules_agenda', dayOfWeek],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_schedules')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('activo', true)
        .order('hora_inicio');
      if (error) throw error;
      return data as DaySchedule[];
    },
  });

  // Fetch day appointments
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['admin_appointments', dateStr],
    queryFn: async () => {
      const dayStart = `${dateStr}T00:00:00`;
      const dayEnd = `${dateStr}T23:59:59`;
      const { data, error } = await supabase
        .from('appointments')
        .select('*, profiles:client_id(nombre, email), services:service_id(nombre, duracion_minutos, precio)')
        .gte('fecha_hora', dayStart)
        .lte('fecha_hora', dayEnd)
        .neq('estado', 'cancelada')
        .order('fecha_hora');
      if (error) throw error;
      return data as AdminAppointment[];
    },
  });

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Search clients
  const { data: clients } = useQuery({
    queryKey: ['admin_clients_search', searchTerm],
    enabled: searchTerm.length >= 2,
    queryFn: async () => {
      const safe = searchTerm.replace(/[%_(),]/g, '');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email')
        .or(`nombre.ilike.%${safe}%,email.ilike.%${safe}%`)
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch blocked slots for date
  const { data: blockedSlots } = useQuery({
    queryKey: ['blocked_slots', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase.from('blocked_slots').select('*').eq('fecha', dateStr);
      if (error) throw error;
      return data;
    },
  });

  // Compute grid boundaries from shifts
  const shifts = dayShifts || [];
  const hasShifts = shifts.length > 0;

  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const gridStartMin = hasShifts ? Math.min(...shifts.map((s) => parseTime(s.hora_inicio))) : 9 * 60;
  const gridEndMin = hasShifts ? Math.max(...shifts.map((s) => parseTime(s.hora_fin))) : 20 * 60;
  const openH = Math.floor(gridStartMin / 60);
  const openM = gridStartMin % 60;
  const totalMinutes = gridEndMin - gridStartMin;
  const gridHeight = totalMinutes * PX_PER_MINUTE;

  // Compute closed gaps between shifts
  const closedGaps: { startMin: number; endMin: number }[] = [];
  if (hasShifts) {
    const sorted = [...shifts].sort((a, b) => parseTime(a.hora_inicio) - parseTime(b.hora_inicio));
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = parseTime(sorted[i].hora_fin);
      const gapEnd = parseTime(sorted[i + 1].hora_inicio);
      if (gapEnd > gapStart) {
        closedGaps.push({ startMin: gapStart, endMin: gapEnd });
      }
    }
  }

  // Generate time labels
  const timeLabels: { label: string; top: number }[] = [];
  for (let m = 0; m <= totalMinutes; m += 30) {
    const h = Math.floor((gridStartMin + m) / 60);
    const min = (gridStartMin + m) % 60;
    timeLabels.push({
      label: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      top: m * PX_PER_MINUTE,
    });
  }

  // Calculate available slots within shifts only
  const getAvailableSlots = useCallback((serviceId: string, excludeApptId?: string) => {
    if (!hasShifts) return [];
    const service = services?.find((s) => s.id === serviceId);
    if (!service) return [];

    const duration = service.duracion_minutos;
    const fullDayBlocked = blockedSlots?.some((b) => !b.hora_inicio);
    if (fullDayBlocked) return [];

    const slots: string[] = [];

    for (const shift of shifts) {
      const [sH, sM] = shift.hora_inicio.split(':').map(Number);
      const [eH, eM] = shift.hora_fin.split(':').map(Number);

      let current = setMinutes(setHours(selectedDate, sH), sM);
      const closing = setMinutes(setHours(selectedDate, eH), eM);
      const lastSlot = addMinutes(closing, -duration);

      while (isBefore(current, lastSlot) || isEqual(current, lastSlot)) {
        const slotStart = current;
        const slotEnd = addMinutes(current, duration);

        const hasConflict = (appointments || []).some((appt) => {
          if (excludeApptId && appt.id === excludeApptId) return false;
          const apptStart = new Date(appt.fecha_hora);
          const apptEnd = addMinutes(apptStart, appt.services?.duracion_minutos || 30);
          return isBefore(slotStart, apptEnd) && isBefore(apptStart, slotEnd);
        });

        const isBlocked = (blockedSlots || []).some((b) => {
          if (!b.hora_inicio || !b.hora_fin) return false;
          const [bh1, bm1] = b.hora_inicio.split(':').map(Number);
          const [bh2, bm2] = b.hora_fin.split(':').map(Number);
          const blockStart = setMinutes(setHours(selectedDate, bh1), bm1);
          const blockEnd = setMinutes(setHours(selectedDate, bh2), bm2);
          return isBefore(slotStart, blockEnd) && isBefore(blockStart, slotEnd);
        });

        if (!hasConflict && !isBlocked) {
          slots.push(format(slotStart, 'HH:mm'));
        }
        current = addMinutes(current, 30);
      }
    }
    return slots;
  }, [hasShifts, shifts, services, appointments, blockedSlots, selectedDate]);

  const availableSlots = selectedServiceId ? getAvailableSlots(selectedServiceId) : [];
  const modifySlots = selectedAppointment ? getAvailableSlots(selectedAppointment.service_id, selectedAppointment.id) : [];

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appointments').update({ estado: 'cancelada' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_appointments'] });
      setSheetOpen(false);
      setSelectedAppointment(null);
      toast({ title: 'Cita cancelada' });
    },
  });

  // Book mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId || !selectedServiceId || !selectedTime) throw new Error('Faltan datos');
      const [h, m] = selectedTime.split(':').map(Number);
      const fechaHora = setMinutes(setHours(selectedDate, h), m);
      const { error } = await supabase.from('appointments').insert({
        client_id: selectedClientId,
        service_id: selectedServiceId,
        fecha_hora: fechaHora.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_appointments'] });
      setDialogOpen(false);
      resetBookingForm();
      toast({ title: 'Cita creada' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear la cita', variant: 'destructive' });
    },
  });

  // Update time mutation
  const updateTimeMutation = useMutation({
    mutationFn: async ({ id, time }: { id: string; time: string }) => {
      const [h, m] = time.split(':').map(Number);
      const fechaHora = setMinutes(setHours(selectedDate, h), m);
      const { error } = await supabase.from('appointments').update({ fecha_hora: fechaHora.toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_appointments'] });
      setSheetOpen(false);
      setSelectedAppointment(null);
      setNewTime(null);
      toast({ title: 'Hora actualizada' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo modificar la hora', variant: 'destructive' });
    },
  });

  const resetBookingForm = () => {
    setSearchTerm('');
    setSelectedClientId(null);
    setSelectedServiceId(null);
    setSelectedTime(null);
  };

  // Click on empty grid space — ignore closed gaps
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest('[data-appointment-block]') ||
      (e.target as HTMLElement).closest('[data-blocked-block]') ||
      (e.target as HTMLElement).closest('[data-closed-block]')
    ) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromOpen = Math.round(y / PX_PER_MINUTE / 30) * 30;
    const totalMin = gridStartMin + minutesFromOpen;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (totalMin >= gridEndMin) return;

    // Don't open dialog if clicking in a closed gap
    const inClosedGap = closedGaps.some((g) => totalMin >= g.startMin && totalMin < g.endMin);
    if (inClosedGap) return;

    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    setSelectedTime(timeStr);
    setDialogOpen(true);
  };

  // Click on appointment block
  const handleAppointmentClick = (appt: AdminAppointment) => {
    setSelectedAppointment(appt);
    setNewTime(null);
    setSheetOpen(true);
  };

  // Position helpers
  const getTop = (dateStr: string) => {
    const d = new Date(dateStr);
    const mins = d.getHours() * 60 + d.getMinutes() - gridStartMin;
    return mins * PX_PER_MINUTE;
  };

  const getHeight = (minutes: number) => minutes * PX_PER_MINUTE;

  return (
    <div className="px-4 py-4">
      {/* Calendar */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          locale={es}
          className="rounded-lg border bg-card p-3 pointer-events-auto"
        />
      </div>

      {/* Day title */}
      <h2 className="mt-4 text-center text-sm font-medium text-muted-foreground capitalize">
        {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
      </h2>

      {/* Time Grid */}
      {isLoading ? (
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : !hasShifts ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">No hay horario configurado para este día</p>
      ) : (
        <div className="mt-4 overflow-x-hidden overflow-y-auto rounded-lg border bg-card" style={{ maxHeight: '60vh' }}>
          <div className="flex" style={{ minHeight: gridHeight }}>
            {/* Time labels column */}
            <div className="relative w-14 shrink-0 border-r border-border">
              {timeLabels.map((t) => (
                <div
                  key={t.label}
                  className="absolute left-0 w-full pr-2 text-right text-[10px] text-muted-foreground -translate-y-1/2"
                  style={{ top: t.top }}
                >
                  {t.label}
                </div>
              ))}
            </div>

            {/* Grid area */}
            <div className="relative flex-1 cursor-pointer" onClick={handleGridClick}>
              {/* Horizontal lines every 30 min */}
              {timeLabels.map((t) => (
                <div
                  key={`line-${t.label}`}
                  className="absolute left-0 right-0 border-t border-border/50"
                  style={{ top: t.top }}
                />
              ))}

              {/* Closed gaps between shifts */}
              {closedGaps.map((gap, i) => {
                const topPx = (gap.startMin - gridStartMin) * PX_PER_MINUTE;
                const heightPx = (gap.endMin - gap.startMin) * PX_PER_MINUTE;
                return (
                  <div
                    key={`gap-${i}`}
                    data-closed-block
                    className="absolute left-0 right-0 bg-muted/40 flex items-center justify-center text-xs text-muted-foreground"
                    style={{ top: topPx, height: heightPx }}
                  >
                    Cerrado
                  </div>
                );
              })}

              {/* Blocked slots */}
              {blockedSlots?.map((b) => {
                if (!b.hora_inicio || !b.hora_fin) {
                  return (
                    <div
                      key={b.id}
                      data-blocked-block
                      className="absolute left-1 right-1 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground"
                      style={{ top: 0, height: gridHeight }}
                    >
                      Bloqueado{b.motivo ? ` — ${b.motivo}` : ''}
                    </div>
                  );
                }
                const topPx = (parseTime(b.hora_inicio) - gridStartMin) * PX_PER_MINUTE;
                const heightPx = (parseTime(b.hora_fin) - parseTime(b.hora_inicio)) * PX_PER_MINUTE;
                return (
                  <div
                    key={b.id}
                    data-blocked-block
                    className="absolute left-1 right-1 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground flex items-center gap-1"
                    style={{ top: topPx, height: heightPx }}
                  >
                    <X className="h-3 w-3" />
                    Bloqueado{b.motivo ? ` — ${b.motivo}` : ''}
                  </div>
                );
              })}

              {/* Appointment blocks */}
              {appointments?.map((appt) => {
                const duration = appt.services?.duracion_minutos || 30;
                const topPx = getTop(appt.fecha_hora);
                const heightPx = getHeight(duration);
                const start = new Date(appt.fecha_hora);
                const end = addMinutes(start, duration);
                const isSmall = heightPx < 50;

                return (
                  <div
                    key={appt.id}
                    data-appointment-block
                    onClick={(e) => { e.stopPropagation(); handleAppointmentClick(appt); }}
                    className="absolute left-1 right-1 cursor-pointer rounded-lg border-l-4 border-primary bg-primary/10 shadow-sm transition-shadow hover:shadow-md overflow-hidden"
                    style={{ top: topPx, height: heightPx }}
                  >
                    {isSmall ? (
                      <div className="flex items-center gap-2 px-2 py-1 text-xs">
                        <span className="font-medium text-foreground truncate">{appt.profiles?.nombre || 'Cliente'}</span>
                        <span className="text-muted-foreground">{format(start, 'HH:mm')}</span>
                      </div>
                    ) : (
                      <div className="p-2">
                        <p className="text-sm font-semibold text-foreground truncate">{appt.profiles?.nombre || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground truncate">{appt.services?.nombre}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FAB for new appointment */}
      <Button
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => { resetBookingForm(); setDialogOpen(true); }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Appointment detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) { setSelectedAppointment(null); setNewTime(null); } }}>
        <SheetContent side="right" className="overflow-y-auto">
          {selectedAppointment && (() => {
            const start = new Date(selectedAppointment.fecha_hora);
            const duration = selectedAppointment.services?.duracion_minutos || 30;
            const end = addMinutes(start, duration);
            return (
              <>
                <SheetHeader>
                  <SheetTitle>Detalle de Cita</SheetTitle>
                  <SheetDescription>
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{selectedAppointment.profiles?.nombre || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground">{selectedAppointment.profiles?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Scissors className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{selectedAppointment.services?.nombre}</p>
                      <p className="text-sm text-muted-foreground">{duration} min</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <p className="font-medium text-foreground">{format(start, 'HH:mm')} – {format(end, 'HH:mm')}</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <p className="font-medium text-foreground">{Number(selectedAppointment.services?.precio || 0).toFixed(2)} €</p>
                  </div>

                  {/* Modify time */}
                  <div className="border-t border-border pt-4">
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" /> Modificar hora
                    </p>
                    {modifySlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay otros horarios disponibles</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {modifySlots.map((t) => (
                          <Button key={t} variant={newTime === t ? 'default' : 'outline'} size="sm" onClick={() => setNewTime(t)}>
                            {t}
                          </Button>
                        ))}
                      </div>
                    )}
                    {newTime && (
                      <Button
                        className="mt-3 w-full"
                        disabled={updateTimeMutation.isPending}
                        onClick={() => updateTimeMutation.mutate({ id: selectedAppointment.id, time: newTime })}
                      >
                        {updateTimeMutation.isPending ? 'Guardando...' : `Mover a ${newTime}`}
                      </Button>
                    )}
                  </div>

                  {/* Cancel */}
                  <div className="border-t border-border pt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">Cancelar Cita</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>No</AlertDialogCancel>
                          <AlertDialogAction onClick={() => cancelMutation.mutate(selectedAppointment.id)}>
                            Sí, cancelar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* New appointment dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetBookingForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cita Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Cliente</label>
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedClientId(null); }}
              />
              {clients && clients.length > 0 && !selectedClientId && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded border border-border bg-card">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => { setSelectedClientId(c.id); setSearchTerm(c.nombre || c.email || ''); }}
                    >
                      {c.nombre || 'Sin nombre'} — {c.email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Servicio</label>
              <Select value={selectedServiceId || ''} onValueChange={(v) => { setSelectedServiceId(v); setSelectedTime(null); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                <SelectContent>
                  {services?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre} ({s.duracion_minutos} min)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedServiceId && (
              <div>
                <label className="text-sm font-medium text-foreground">Hora</label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay horarios disponibles</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {availableSlots.map((t) => (
                      <Button key={t} variant={selectedTime === t ? 'default' : 'outline'} size="sm" onClick={() => setSelectedTime(t)}>
                        {t}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedClientId || !selectedServiceId || !selectedTime || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
            >
              {bookMutation.isPending ? 'Creando...' : 'Crear Cita'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
