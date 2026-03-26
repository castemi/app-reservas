import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { CreditCard, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Activa', variant: 'default' },
  trialing: { label: 'Periodo de prueba', variant: 'secondary' },
  past_due: { label: 'Pago pendiente', variant: 'destructive' },
  canceled: { label: 'Cancelada', variant: 'destructive' },
  none: { label: 'Sin suscripción', variant: 'outline' },
};

export default function AdminFacturacion() {
  const [connectLoading, setConnectLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['business_settings_stripe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('id, stripe_account_id, stripe_customer_id, subscription_status')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleConnectAccount = async () => {
    setConnectLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-connect-account', {
        body: { return_url: window.location.origin },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-portal-session', {
        body: { return_url: window.location.origin },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const { url } = res.data;
      if (url) window.location.href = url;
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Error desconocido', variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const subscriptionStatus = (settings?.subscription_status as string) || 'none';
  const statusInfo = statusLabels[subscriptionStatus] || statusLabels.none;
  const hasStripeAccount = !!settings?.stripe_account_id;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-foreground">Facturación y Pagos</h2>

      {/* Stripe Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-accent" />
            Cuenta bancaria (Stripe Connect)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasStripeAccount ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Cuenta conectada
              <span className="font-mono text-xs text-muted-foreground/60">
                {settings!.stripe_account_id!.slice(0, 12)}…
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              No has conectado tu cuenta bancaria. Conéctala para poder recibir pagos de tus clientes.
            </div>
          )}
          <Button
            onClick={handleConnectAccount}
            disabled={connectLoading}
            variant={hasStripeAccount ? 'outline' : 'default'}
          >
            {connectLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <ExternalLink className="mr-2 h-4 w-4" />
            {hasStripeAccount ? 'Actualizar cuenta bancaria' : 'Conectar cuenta bancaria'}
          </Button>
        </CardContent>
      </Card>

      {/* SaaS Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-accent" />
            Suscripción a la plataforma
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Estado:</span>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
          <Button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            variant={subscriptionStatus === 'none' ? 'default' : 'outline'}
          >
            {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <ExternalLink className="mr-2 h-4 w-4" />
            {subscriptionStatus === 'none' ? 'Activar Suscripción' : 'Gestionar Suscripción'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
