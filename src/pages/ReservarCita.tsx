import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, setHours, setMinutes, addMinutes, isBefore, isEqual, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/hooks/use-toast';
import { Clock, DollarSign, CheckCircle2 } from 'lucide-react';

type Service = {
  id: string;
  nombre: string;
  duracion_minutos: number;
  precio: number;
  image_url: string | null;
};

type DaySchedule = {
  id: string;
  day_of_week: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
};

export default function ReservarCita() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Fetch services
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*');
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch all day_schedules (active)
  const { data: daySchedules } = useQuery({
    queryKey: ['day_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_schedules')
        .select('*')
        .eq('activo', true)
        .order('hora_inicio');
      if (error) throw error;
      return data as DaySchedule[];
    },
  });

  // Fetch appointments for selected date
  const { data: dayAppointments, isLoading: loadingSlots } = useQuery({
    queryKey: ['appointments_day', selectedDate?.toISOString()],
    enabled: !!selectedDate && !!selectedService,
    queryFn: async () => {
      if (!selectedDate) return [];
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select('fecha_hora, service_id, services(duracion_minutos)')
        .gte('fecha_hora', dayStart)
        .lte('fecha_hora', dayEnd.toISOString())
        .neq('estado', 'cancelada');
      if (error) throw error;
      return data as Array<{ fecha_hora: string; service_id: string; services: { duracion_minutos: number } }>;
    },
  });

  // Fetch blocked slots for selected date
  const { data: blockedSlots } = useQuery({
    queryKey: ['blocked_slots', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null],
    enabled: !!selectedDate,
    queryFn: async () => {
      if (!selectedDate) return [];
      const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('fecha', format(selectedDate, 'yyyy-MM-dd'));
      if (error) throw error;
      return data;
    },
  });

  // Group schedules by day_of_week
  const schedulesByDay = (daySchedules || []).reduce<Record<number, DaySchedule[]>>((acc, s) => {
    if (!acc[s.day_of_week]) acc[s.day_of_week] = [];
    acc[s.day_of_week].push(s);
    return acc;
  }, {});

  // Calculate available slots using day_schedules shifts
  const availableSlots = (() => {
    if (!selectedDate || !selectedService || !daySchedules) return [];

    const dayOfWeek = selectedDate.getDay();
    const shifts = schedulesByDay[dayOfWeek];
    if (!shifts || shifts.length === 0) return [];

    // Check if full day is blocked
    const fullDayBlocked = (blockedSlots || []).some((b) => !b.hora_inicio);
    if (fullDayBlocked) return [];

    const serviceDuration = selectedService.duracion_minutos;
    const now = new Date();
    const slots: string[] = [];

    // Generate slots for each shift
    for (const shift of shifts) {
      const [openH, openM] = shift.hora_inicio.split(':').map(Number);
      const [closeH, closeM] = shift.hora_fin.split(':').map(Number);

      let current = setMinutes(setHours(selectedDate, openH), openM);
      const closing = setMinutes(setHours(selectedDate, closeH), closeM);
      const lastSlot = addMinutes(closing, -serviceDuration);

      while (isBefore(current, lastSlot) || isEqual(current, lastSlot)) {
        const slotStart = current;
        const slotEnd = addMinutes(current, serviceDuration);

        // Check if slot is in the past
        if (isBefore(slotStart, now)) {
          current = addMinutes(current, 30);
          continue;
        }

        // Check overlap with existing appointments
        const hasConflict = (dayAppointments || []).some((appt) => {
          const apptStart = new Date(appt.fecha_hora);
          const apptEnd = addMinutes(apptStart, appt.services?.duracion_minutos || 30);
          return isBefore(slotStart, apptEnd) && isBefore(apptStart, slotEnd);
        });

        // Check overlap with blocked time slots
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
  })();

  // Disable days without active schedules and past dates
  const disabledDays = (date: Date) => {
    const day = date.getDay();
    if (!schedulesByDay[day] || schedulesByDay[day].length === 0) return true;
    if (isBefore(date, startOfDay(new Date()))) return true;
    return false;
  };

  // Book mutation - redirects to Stripe Checkout
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime || !selectedService || !user) throw new Error('Faltan datos');
      const [h, m] = selectedTime.split(':').map(Number);
      const fechaHora = setMinutes(setHours(selectedDate, h), m);

      const { data: { session } } = await supabase.auth.getSession();

      const res = await supabase.functions.invoke('create-booking-checkout', {
        body: { service_id: selectedService.id, fecha_hora: fechaHora.toISOString() },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) throw new Error(res.error.message);
      const { url } = res.data;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No se pudo crear la sesión de pago');
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'No se pudo iniciar el pago. Inténtalo de nuevo.', variant: 'destructive' });
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Reservar Cita" />

      <main className="flex-1 px-4 py-6">
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-accent' : s < step ? 'w-8 bg-primary' : 'w-8 bg-muted'}`}
            />
          ))}
        </div>

        {/* Step 1: Select service */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-center text-base font-medium text-muted-foreground">Elige un servicio</h2>
            {loadingServices ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              services?.map((service) => (
                <Card
                  key={service.id}
                  className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                  onClick={() => { setSelectedService(service); setStep(2); }}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{service.nombre}</p>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{service.duracion_minutos} min</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{Number(service.precio).toFixed(2)} €</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 2: Select date & time */}
        {step === 2 && selectedService && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-base font-medium text-muted-foreground">Selecciona fecha y hora</h2>
              <p className="text-sm text-muted-foreground">{selectedService.nombre}</p>
            </div>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                disabled={disabledDays}
                locale={es}
                className="rounded-lg border bg-card p-3 pointer-events-auto"
              />
            </div>

            {selectedDate && (
              <div>
                <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
                  {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">No hay horas disponibles este día</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setSelectedTime(time); setStep(3); }}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button variant="ghost" className="w-full" onClick={() => { setStep(1); setSelectedDate(undefined); setSelectedTime(null); }}>
              ← Cambiar servicio
            </Button>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && selectedService && selectedDate && selectedTime && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
              <h2 className="mt-2 text-lg font-semibold">Confirma tu cita</h2>
            </div>

            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servicio</span>
                  <span className="font-medium">{selectedService.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-medium">{format(selectedDate, "d 'de' MMMM yyyy", { locale: es })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-accent">{Number(selectedService.precio).toFixed(2)} €</span>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={() => bookMutation.mutate()}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? 'Procesando...' : 'Pagar y Confirmar Reserva'}
            </Button>

            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
              ← Cambiar hora
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
