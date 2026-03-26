import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, ChevronDown } from 'lucide-react';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo

type DaySchedule = {
  id: string;
  day_of_week: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  created_at: string | null;
};

export default function AdminHorarios() {
  const queryClient = useQueryClient();
  const [newShift, setNewShift] = useState<{ day: number; start: string; end: string } | null>(null);

  // Fetch all day_schedules
  const { data: schedules } = useQuery({
    queryKey: ['day_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('day_schedules')
        .select('*')
        .order('day_of_week')
        .order('hora_inicio');
      if (error) throw error;
      return data as DaySchedule[];
    },
  });

  const groupedByDay = (schedules || []).reduce<Record<number, DaySchedule[]>>((acc, s) => {
    if (!acc[s.day_of_week]) acc[s.day_of_week] = [];
    acc[s.day_of_week].push(s);
    return acc;
  }, {});

  const isDayActive = (day: number) => {
    const daySchedules = groupedByDay[day];
    return daySchedules && daySchedules.some((s) => s.activo);
  };

  // Toggle day: if active → delete all, if inactive → insert default 09:00-14:00
  const toggleDayMutation = useMutation({
    mutationFn: async (day: number) => {
      if (isDayActive(day)) {
        const ids = (groupedByDay[day] || []).map((s) => s.id);
        if (ids.length > 0) {
          const { error } = await supabase.from('day_schedules').delete().in('id', ids);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('day_schedules').insert({
          day_of_week: day,
          hora_inicio: '09:00',
          hora_fin: '14:00',
          activo: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day_schedules'] });
    },
  });

  // Add shift
  const addShiftMutation = useMutation({
    mutationFn: async ({ day, start, end }: { day: number; start: string; end: string }) => {
      const { error } = await supabase.from('day_schedules').insert({
        day_of_week: day,
        hora_inicio: start,
        hora_fin: end,
        activo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day_schedules'] });
      setNewShift(null);
      toast({ title: 'Turno añadido' });
    },
  });

  // Delete shift
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('day_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day_schedules'] });
      toast({ title: 'Turno eliminado' });
    },
  });

  // ── Blocked slots (unchanged) ──
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [fullDay, setFullDay] = useState(true);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockMotivo, setBlockMotivo] = useState('');

  const blockDateStr = blockDate ? format(blockDate, 'yyyy-MM-dd') : null;

  const { data: blocks } = useQuery({
    queryKey: ['blocked_slots_admin', blockDateStr],
    enabled: !!blockDateStr,
    queryFn: async () => {
      const { data, error } = await supabase.from('blocked_slots').select('*').eq('fecha', blockDateStr!).order('hora_inicio');
      if (error) throw error;
      return data;
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: async () => {
      if (!blockDate) return;
      const row: any = { fecha: format(blockDate, 'yyyy-MM-dd'), motivo: blockMotivo };
      if (!fullDay) {
        row.hora_inicio = blockStart;
        row.hora_fin = blockEnd;
      }
      const { error } = await supabase.from('blocked_slots').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked_slots_admin'] });
      setBlockMotivo('');
      setBlockStart('');
      setBlockEnd('');
      toast({ title: 'Bloqueo añadido' });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked_slots_admin'] });
      toast({ title: 'Bloqueo eliminado' });
    },
  });

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Horarios por día */}
      <Card>
        <CardHeader><CardTitle className="text-base">Horarios por Día</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {DAY_ORDER.map((day) => {
            const active = isDayActive(day);
            const shifts = groupedByDay[day]?.filter((s) => s.activo) || [];
            return (
              <Collapsible key={day}>
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                    <span className="text-sm font-medium">{DAY_NAMES[day]}</span>
                    {!active && <span className="text-xs text-muted-foreground">(Cerrado)</span>}
                  </CollapsibleTrigger>
                  <Switch
                    checked={active}
                    onCheckedChange={() => toggleDayMutation.mutate(day)}
                    disabled={toggleDayMutation.isPending}
                  />
                </div>
                <CollapsibleContent className="pl-9 pr-3 pb-2 space-y-2 pt-2">
                  {shifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-md bg-card border px-3 py-2">
                      <span className="text-sm">
                        {s.hora_inicio.slice(0, 5)} — {s.hora_fin.slice(0, 5)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteShiftMutation.mutate(s.id)}
                        disabled={deleteShiftMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* Add shift form */}
                  {newShift?.day === day ? (
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Inicio</label>
                        <Input
                          type="time"
                          value={newShift.start}
                          onChange={(e) => setNewShift({ ...newShift, start: e.target.value })}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Fin</label>
                        <Input
                          type="time"
                          value={newShift.end}
                          onChange={(e) => setNewShift({ ...newShift, end: e.target.value })}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!newShift.start || !newShift.end || addShiftMutation.isPending}
                        onClick={() => addShiftMutation.mutate({ day, start: newShift.start, end: newShift.end })}
                      >
                        Añadir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setNewShift(null)}>✕</Button>
                    </div>
                  ) : (
                    active && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setNewShift({ day, start: '', end: '' })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Añadir turno
                      </Button>
                    )
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Blocked slots – unchanged */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bloqueos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={blockDate}
              onSelect={setBlockDate}
              locale={es}
              className="rounded-lg border bg-card p-3 pointer-events-auto"
            />
          </div>

          {blockDate && (
            <>
              <p className="text-center text-sm font-medium text-muted-foreground">
                {format(blockDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>

              <div className="flex items-center gap-2">
                <Switch checked={fullDay} onCheckedChange={setFullDay} />
                <span className="text-sm">{fullDay ? 'Día completo' : 'Tramo horario'}</span>
              </div>

              {!fullDay && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Desde</label>
                    <Input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Hasta</label>
                    <Input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
                  </div>
                </div>
              )}

              <Input placeholder="Motivo (opcional)" value={blockMotivo} onChange={(e) => setBlockMotivo(e.target.value)} />

              <Button
                className="w-full"
                onClick={() => addBlockMutation.mutate()}
                disabled={addBlockMutation.isPending || (!fullDay && (!blockStart || !blockEnd))}
              >
                Añadir Bloqueo
              </Button>

              {blocks && blocks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Bloqueos existentes:</p>
                  {blocks.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                      <span className="text-sm">
                        {b.hora_inicio ? `${b.hora_inicio.slice(0, 5)} - ${b.hora_fin?.slice(0, 5)}` : 'Día completo'}
                        {b.motivo ? ` · ${b.motivo}` : ''}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteBlockMutation.mutate(b.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
