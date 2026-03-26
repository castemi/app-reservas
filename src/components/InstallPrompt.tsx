import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('install-prompt-dismissed')) return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOSPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    setDismissed(true);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
    localStorage.setItem('install-prompt-dismissed', '1');
  };

  if (dismissed || (!deferredPrompt && !showIOSPrompt)) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 rounded-xl border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-4 sm:left-auto sm:right-4 sm:max-w-sm">
      <button onClick={handleDismiss} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>

      {showIOSPrompt ? (
        <div className="flex items-start gap-3 pr-6">
          <Share className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-medium text-foreground">Instalar El Corte Fino</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pulsa <strong>Compartir</strong> <Share className="inline h-3 w-3" /> y luego <strong>"Añadir a pantalla de inicio"</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 pr-6">
          <Download className="h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Instalar la app</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Accede más rápido desde tu pantalla de inicio.</p>
          </div>
          <Button size="sm" onClick={handleInstall}>
            Instalar
          </Button>
        </div>
      )}
    </div>
  );
}
