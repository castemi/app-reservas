import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Privacidad() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Política de Privacidad</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <article className="prose prose-sm mx-auto max-w-lg text-foreground">
          <p className="text-sm text-muted-foreground">Última actualización: marzo 2026</p>

          <h2 className="mt-6 text-base font-semibold">1. Responsable del tratamiento</h2>
          <p className="text-sm text-muted-foreground">
            El Corte Fino es responsable del tratamiento de los datos personales recogidos a través de esta aplicación.
          </p>

          <h2 className="mt-6 text-base font-semibold">2. Datos que recogemos</h2>
          <p className="text-sm text-muted-foreground">
            Recogemos los datos que nos proporcionas al registrarte (nombre, email, teléfono) y los generados por el uso del servicio (citas, preferencias).
          </p>

          <h2 className="mt-6 text-base font-semibold">3. Finalidad</h2>
          <p className="text-sm text-muted-foreground">
            Tus datos se utilizan para gestionar tu cuenta, procesar reservas de citas, enviar confirmaciones y recordatorios, y mejorar nuestros servicios.
          </p>

          <h2 className="mt-6 text-base font-semibold">4. Base legal</h2>
          <p className="text-sm text-muted-foreground">
            El tratamiento se basa en la ejecución del contrato de servicio y, en su caso, en tu consentimiento expreso.
          </p>

          <h2 className="mt-6 text-base font-semibold">5. Conservación</h2>
          <p className="text-sm text-muted-foreground">
            Los datos se conservan mientras mantengas tu cuenta activa y durante el plazo legalmente exigible tras su baja.
          </p>

          <h2 className="mt-6 text-base font-semibold">6. Derechos</h2>
          <p className="text-sm text-muted-foreground">
            Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición contactándonos en info@elcortefino.com.
          </p>

          <h2 className="mt-6 text-base font-semibold">7. Cookies</h2>
          <p className="text-sm text-muted-foreground">
            Utilizamos cookies técnicas necesarias para el funcionamiento de la aplicación. Puedes gestionar tus preferencias en el banner de cookies.
          </p>

          <h2 className="mt-6 text-base font-semibold">8. Seguridad</h2>
          <p className="text-sm text-muted-foreground">
            Aplicamos medidas técnicas y organizativas para proteger tus datos, incluyendo cifrado en tránsito y almacenamiento seguro.
          </p>
        </article>
      </main>
    </div>
  );
}
