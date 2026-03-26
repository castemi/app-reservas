import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DollarSign, CalendarCheck, TrendingUp, UserPlus } from 'lucide-react';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, startOfYear, endOfYear, format, parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';

type Period = 'week' | 'month' | 'last_month' | 'year';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
];

function getRange(period: Period) {
  const now = new Date();
  switch (period) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) };
  }
}

export default function AdminAnaliticas() {
  const [period, setPeriod] = useState<Period>('month');

  const { start, end } = useMemo(() => getRange(period), [period]);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const { data: appointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['analytics-appointments', startISO, endISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('fecha_hora, service_id, services(nombre, precio)')
        .eq('estado', 'completada')
        .gte('fecha_hora', startISO)
        .lte('fecha_hora', endISO);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: newClientsCount = 0, isLoading: loadingClients } = useQuery({
    queryKey: ['analytics-clients', startISO, endISO],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startISO)
        .lte('created_at', endISO);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const loading = loadingAppts || loadingClients;

  // KPIs
  const totalIncome = useMemo(
    () => appointments.reduce((sum, a) => {
      const svc = a.services as unknown as { nombre: string; precio: number } | null;
      return sum + (svc?.precio ?? 0);
    }, 0),
    [appointments],
  );
  const totalAppts = appointments.length;
  const avgTicket = totalAppts > 0 ? totalIncome / totalAppts : 0;

  // Revenue chart data
  const revenueData = useMemo(() => {
    const map: Record<string, number> = {};
    const isYear = period === 'year';
    appointments.forEach((a) => {
      const d = parseISO(a.fecha_hora);
      const key = isYear ? format(d, 'MMM', { locale: es }) : format(d, 'dd/MM');
      const svc = a.services as unknown as { nombre: string; precio: number } | null;
      map[key] = (map[key] ?? 0) + (svc?.precio ?? 0);
    });
    return Object.entries(map).map(([name, total]) => ({ name, total }));
  }, [appointments, period]);

  // Services chart data
  const servicesData = useMemo(() => {
    const map: Record<string, number> = {};
    appointments.forEach((a) => {
      const svc = a.services as unknown as { nombre: string; precio: number } | null;
      const name = svc?.nombre ?? 'Desconocido';
      map[name] = (map[name] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [appointments]);

  const revenueConfig = { total: { label: 'Ingresos €', color: 'hsl(var(--primary))' } };
  const servicesConfig = Object.fromEntries(
    servicesData.map((s, i) => [s.name, { label: s.name, color: COLORS[i % COLORS.length] }]),
  );

  return (
    <div className="space-y-6 p-4">
      {/* Header + Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Analíticas</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="last_month">Mes Pasado</SelectItem>
            <SelectItem value="year">Este Año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <KpiCard icon={DollarSign} label="Ingresos Totales" value={`${totalIncome.toFixed(2)} €`} loading={loading} />
        <KpiCard icon={CalendarCheck} label="Citas Atendidas" value={String(totalAppts)} loading={loading} />
        <KpiCard icon={TrendingUp} label="Ticket Medio" value={`${avgTicket.toFixed(2)} €`} loading={loading} />
        <KpiCard icon={UserPlus} label="Nuevos Clientes" value={String(newClientsCount)} loading={loading} />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este periodo</p>
          ) : (
            <ChartContainer config={revenueConfig} className="h-[250px] w-full">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Services Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Servicios más Populares</CardTitle>
        </CardHeader>
        <CardContent>
          {servicesData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este periodo</p>
          ) : (
            <ChartContainer config={servicesConfig} className="h-[280px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={servicesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {servicesData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, loading }: { icon: React.ElementType; label: string; value: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-1 h-5 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-lg font-bold text-foreground">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
