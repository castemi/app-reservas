import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';

export default function ConfirmacionReserva() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Could verify session with Stripe here if needed
  }, [sessionId]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Reserva Confirmada" />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
        <CheckCircle2 className="h-16 w-16 text-accent" />
        <h2 className="text-xl font-semibold text-foreground">¡Pago completado!</h2>
        <p className="text-center text-muted-foreground">
          Tu cita ha sido reservada y el pago de la fianza se ha procesado correctamente.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/mis-citas')}>Ver mis citas</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Inicio</Button>
        </div>
      </main>
    </div>
  );
}
