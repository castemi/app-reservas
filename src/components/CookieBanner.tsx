import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const handleConsent = (accepted: boolean) => {
    localStorage.setItem('cookie-consent', accepted ? 'accepted' : 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <div className="mx-auto flex max-w-lg flex-col gap-3">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-muted-foreground">
            Usamos cookies para mejorar tu experiencia. Consulta nuestra{' '}
            <Link to="/privacidad" className="font-medium text-primary underline">
              Política de Privacidad
            </Link>{' '}
            y{' '}
            <Link to="/terminos" className="font-medium text-primary underline">
              Términos de Uso
            </Link>.
          </p>
        </div>
        <div className="flex gap-2 self-end">
          <Button variant="outline" size="sm" onClick={() => handleConsent(false)}>
            Rechazar
          </Button>
          <Button size="sm" onClick={() => handleConsent(true)}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
