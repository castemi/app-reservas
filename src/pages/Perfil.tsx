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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Camera, LogOut, CalendarCheck, Store, Image, Instagram, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Perfil() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [uploading, setUploading] = useState(false);

  // Business settings state (admin only)
  const [bizNombre, setBizNombre] = useState('');
  const [bizTipo, setBizTipo] = useState('');
  const [bizInstagram, setBizInstagram] = useState('');
  const [bizDireccion, setBizDireccion] = useState('');
  const [bizTelefono, setBizTelefono] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

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

  const { data: bizSettings } = useQuery({
    queryKey: ['business-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? '');
      setTelefono(profile.telefono ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (bizSettings) {
      setBizNombre(bizSettings.nombre ?? '');
      setBizTipo((bizSettings as any).tipo_negocio ?? '');
      setBizInstagram((bizSettings as any).instagram_url ?? '');
      setBizDireccion(bizSettings.direccion ?? '');
      setBizTelefono(bizSettings.telefono ?? '');
      setBizEmail(bizSettings.email_contacto ?? '');
    }
  }, [bizSettings]);

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

  const updateBizSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('business_settings')
        .update({
          nombre: bizNombre,
          tipo_negocio: bizTipo,
          instagram_url: bizInstagram,
          direccion: bizDireccion,
          telefono: bizTelefono,
          email_contacto: bizEmail,
        } as any)
        .eq('id', bizSettings!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      queryClient.invalidateQueries({ queryKey: ['business_settings'] });
      toast({ title: 'Datos del negocio actualizados' });
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

  const handleBusinessImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'background',
  ) => {
    const file = e.target.files?.[0];
    if (!file || !bizSettings) return;
    const setLoading = type === 'logo' ? setUploadingLogo : setUploadingBg;
    setLoading(true);
    try {
      const maxWidth = type === 'logo' ? 512 : 1920;
      const quality = type === 'logo' ? 0.8 : 0.85;
      const compressed = await compressImage(file, maxWidth, quality);
      const path = `${type}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('business-assets').getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;

      const column = type === 'logo' ? 'logo_url' : 'background_url';
      const { error: updateError } = await supabase
        .from('business_settings')
        .update({ [column]: url } as any)
        .eq('id', bizSettings.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      queryClient.invalidateQueries({ queryKey: ['business_settings'] });
      toast({ title: type === 'logo' ? 'Logo actualizado' : 'Fondo actualizado' });
    } catch {
      toast({ title: 'Error al subir imagen', variant: 'destructive' });
    } finally {
      setLoading(false);
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

        {/* Admin: Business customization */}
        {isAdmin && bizSettings && (
          <>
            <Separator className="my-2 w-full max-w-sm" />
            <Card className="w-full max-w-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Store className="h-5 w-5 text-primary" />
                  Personalización del negocio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Business name */}
                <div className="space-y-2">
                  <Label htmlFor="biz-nombre">Nombre del negocio</Label>
                  <Input id="biz-nombre" value={bizNombre} onChange={(e) => setBizNombre(e.target.value)} />
                </div>

                {/* Business type */}
                <div className="space-y-2">
                  <Label htmlFor="biz-tipo">Tipo de negocio</Label>
                  <Input id="biz-tipo" value={bizTipo} onChange={(e) => setBizTipo(e.target.value)} placeholder="Barbería, Peluquería, Spa…" />
                </div>

                {/* Instagram URL */}
                <div className="space-y-2">
                  <Label htmlFor="biz-instagram" className="flex items-center gap-1.5">
                    <Instagram className="h-4 w-4" /> Instagram
                  </Label>
                <Input id="biz-instagram" value={bizInstagram} onChange={(e) => setBizInstagram(e.target.value)} placeholder="https://www.instagram.com/tu_negocio" />
                {bizInstagram && !/^https?:\/\/(www\.)?instagram\.com\/.+/i.test(bizInstagram) && (
                  <p className="text-xs text-destructive">URL de Instagram no válida</p>
                )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="biz-direccion" className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> Dirección
                  </Label>
                  <Input id="biz-direccion" value={bizDireccion} onChange={(e) => setBizDireccion(e.target.value)} />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="biz-telefono" className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" /> Teléfono
                  </Label>
                  <Input id="biz-telefono" value={bizTelefono} onChange={(e) => setBizTelefono(e.target.value)} />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="biz-email" className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> Email de contacto
                  </Label>
                  <Input id="biz-email" type="email" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} />
                </div>

                {/* Logo upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Image className="h-4 w-4" /> Logo del negocio
                  </Label>
                  {(bizSettings as any).logo_url && (
                    <img src={(bizSettings as any).logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-cover" />
                  )}
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? 'Subiendo…' : 'Cambiar logo'}
                  </Button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleBusinessImageUpload(e, 'logo')} />
                </div>

                {/* Background upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Image className="h-4 w-4" /> Fondo de pantalla de inicio
                  </Label>
                  {(bizSettings as any).background_url && (
                    <img src={(bizSettings as any).background_url} alt="Fondo" className="h-20 w-full rounded-xl object-cover" />
                  )}
                  <Button variant="outline" size="sm" onClick={() => bgInputRef.current?.click()} disabled={uploadingBg}>
                    {uploadingBg ? 'Subiendo…' : 'Cambiar fondo'}
                  </Button>
                  <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleBusinessImageUpload(e, 'background')} />
                </div>

                <Button
                  className="w-full"
                  onClick={() => updateBizSettings.mutate()}
                  disabled={updateBizSettings.isPending}
                >
                  {updateBizSettings.isPending ? 'Guardando…' : 'Guardar datos del negocio'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Sign out */}
        <Button variant="ghost" className="mt-4 text-destructive" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
