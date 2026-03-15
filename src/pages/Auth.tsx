import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Email enviado', description: 'Revisa tu correo para restablecer la contraseña.' });
      setSubmitting(false);
      return;
    }

    if (mode === 'register') {
      const { error } = await signUp(email, password, nombre, telefono);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: '¡Registro exitoso!', description: 'Revisa tu correo para confirmar tu cuenta.' });
    } else {
      const { error } = await signIn(email, password);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Scissors className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Barbería El Corte Fino</CardTitle>
          <CardDescription>
            {mode === 'login' && 'Inicia sesión en tu cuenta'}
            {mode === 'register' && 'Crea tu cuenta'}
            {mode === 'forgot' && 'Recupera tu contraseña'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu teléfono" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Cargando...' : mode === 'login' ? 'Iniciar Sesión' : mode === 'register' ? 'Registrarse' : 'Enviar enlace'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm space-y-1">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('forgot')} className="text-muted-foreground hover:text-foreground underline block mx-auto">¿Olvidaste tu contraseña?</button>
                <p className="text-muted-foreground">¿No tienes cuenta? <button onClick={() => setMode('register')} className="text-foreground font-medium underline">Regístrate</button></p>
              </>
            )}
            {mode === 'register' && (
              <p className="text-muted-foreground">¿Ya tienes cuenta? <button onClick={() => setMode('login')} className="text-foreground font-medium underline">Inicia sesión</button></p>
            )}
            {mode === 'forgot' && (
              <button onClick={() => setMode('login')} className="text-muted-foreground hover:text-foreground underline">Volver al inicio de sesión</button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
