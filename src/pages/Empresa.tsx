import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Clock, Calendar } from 'lucide-react';

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function Empresa() {
  const navigate = useNavigate();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['business-settings-public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_settings_public' as any).select('id, nombre, email_contacto, telefono, direccion, horario_apertura, horario_cierre, dias_laborables').limit(1).single();
      if (error) throw error;
      return data as any;
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Empresa" />

      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : settings ? (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{settings.nombre}</h2>
            </div>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                    <p className="text-foreground">{settings.direccion}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                    <p className="text-foreground">{settings.telefono}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-foreground">{settings.email_contacto}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Horario</p>
                    <p className="text-foreground">
                      {settings.horario_apertura.slice(0, 5)} - {settings.horario_cierre.slice(0, 5)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Días laborables</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(settings.dias_laborables as number[]).map((d) => (
                        <span key={d} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          {dayNames[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => navigate('/')}>
                Volver al inicio
              </Button>
              <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <Link to="/privacidad" className="underline hover:text-foreground">Política de Privacidad</Link>
                <Link to="/terminos" className="underline hover:text-foreground">Términos de Uso</Link>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No se encontró información de la empresa</p>
        )}
      </main>
    </div>
  );
}
