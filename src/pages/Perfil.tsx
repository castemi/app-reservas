import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/lib/compressImage';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Camera, LogOut, CalendarCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Perfil() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: completedCount } = useQuery({
    queryKey: ['completed-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user!.id)
        .eq('estado', 'completada');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? '');
      setTelefono(profile.telefono ?? '');
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ nombre, telefono })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({ title: 'Perfil actualizado' });
    },
    onError: () => toast({ title: 'Error al guardar', variant: 'destructive' }),
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 400, 0.7);
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url })
        .eq('id', user.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      toast({ title: 'Foto actualizada' });
    } catch {
      toast({ title: 'Error al subir imagen', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Mi Perfil" />

      <div className="flex flex-1 flex-col items-center gap-6 px-6 py-8">
        {/* Avatar */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group relative h-28 w-28 overflow-hidden rounded-full shadow-lg ring-4 ring-background"
          disabled={uploading}
        >
          <Avatar className="h-full w-full">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="Avatar" />
            <AvatarFallback className="bg-muted">
              <User className="h-10 w-10 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </button>

        {/* Stats */}
        <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {completedCount ?? 0} citas completadas
          </span>
        </div>

        {/* Form */}
        <div className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>

          <Button
            className="w-full"
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>

        {/* Sign out */}
        <Button variant="ghost" className="mt-4 text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
