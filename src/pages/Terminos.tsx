import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Terminos() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Términos de Uso</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <article className="prose prose-sm mx-auto max-w-lg text-foreground">
          <p className="text-sm text-muted-foreground">Última actualización: marzo 2026</p>

          <h2 className="mt-6 text-base font-semibold">1. Objeto</h2>
          <p className="text-sm text-muted-foreground">
            Estos términos regulan el uso de la aplicación El Corte Fino para la reserva de citas de peluquería y barbería.
          </p>

          <h2 className="mt-6 text-base font-semibold">2. Registro</h2>
          <p className="text-sm text-muted-foreground">
            Para utilizar el servicio debes registrarte con datos veraces. Eres responsable de mantener la confidencialidad de tu cuenta.
          </p>

          <h2 className="mt-6 text-base font-semibold">3. Reservas y cancelaciones</h2>
          <p className="text-sm text-muted-foreground">
            Las citas pueden cancelarse con al menos 24 horas de antelación. Las cancelaciones tardías o ausencias reiteradas podrán conllevar restricciones en el servicio.
          </p>

          <h2 className="mt-6 text-base font-semibold">4. Pagos y fianzas</h2>
          <p className="text-sm text-muted-foreground">
            Algunas reservas pueden requerir el pago de una fianza a través de la pasarela de pago segura. La fianza se descontará del precio final del servicio.
          </p>

          <h2 className="mt-6 text-base font-semibold">5. Propiedad intelectual</h2>
          <p className="text-sm text-muted-foreground">
            Todos los contenidos de la aplicación (diseño, logotipos, textos) son propiedad de El Corte Fino y no pueden reproducirse sin autorización.
          </p>

          <h2 className="mt-6 text-base font-semibold">6. Limitación de responsabilidad</h2>
          <p className="text-sm text-muted-foreground">
            El Corte Fino no se responsabiliza de interrupciones del servicio por causas ajenas a su control ni de daños derivados del uso incorrecto de la aplicación.
          </p>

          <h2 className="mt-6 text-base font-semibold">7. Modificaciones</h2>
          <p className="text-sm text-muted-foreground">
            Nos reservamos el derecho de modificar estos términos. Los cambios se comunicarán a través de la aplicación y entrarán en vigor desde su publicación.
          </p>

          <h2 className="mt-6 text-base font-semibold">8. Legislación aplicable</h2>
          <p className="text-sm text-muted-foreground">
            Estos términos se rigen por la legislación española. Para cualquier controversia serán competentes los juzgados de la localidad del establecimiento.
          </p>
        </article>
      </main>
    </div>
  );
}
