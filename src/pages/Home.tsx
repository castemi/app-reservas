import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CalendarDays, Scissors, Instagram, Building2, Bell, User } from 'lucide-react';
import barbershopBg from '@/assets/barbershop-bg.jpg';

export default function Home() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ['business-settings-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings_public' as any)
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const bizName = settings?.nombre ?? 'El Corte Fino';
  const bizType = (settings as any)?.tipo_negocio ?? 'Barbería';
  const logoUrl = (settings as any)?.logo_url as string | null;
  const bgUrl = (settings as any)?.background_url as string | null;
  const instagramUrl = (settings as any)?.instagram_url as string | undefined;

  const menuItems = [
    { icon: CalendarDays, label: 'Mis Citas', path: '/mis-citas' },
    { icon: Scissors, label: 'Reservar Cita', path: '/reservar' },
    { icon: Instagram, label: 'Instagram', path: instagramUrl || '#', external: !!instagramUrl },
    { icon: Building2, label: 'Empresa', path: '/empresa' },
    { icon: Bell, label: 'Notificaciones', path: '/notificaciones' },
    { icon: User, label: 'Perfil', path: '/perfil' },
  ];

  const handleClick = (item: (typeof menuItems)[0]) => {
    if ('external' in item && item.external) {
      window.open(item.path, '_blank');
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgUrl || barbershopBg})` }}
      >
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6 py-12">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Scissors className="h-8 w-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">{bizName}</h1>
          <p className="mt-1 text-sm font-light tracking-widest text-white/70 uppercase">{bizType}</p>
        </div>

        {/* Menu Grid */}
        <div className="grid w-full grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleClick(item)}
              className="group flex flex-col items-center gap-2 rounded-[30px] bg-white/95 p-5 shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white hover:shadow-xl active:scale-95"
            >
              <item.icon className="h-7 w-7 text-foreground transition-colors group-hover:text-accent" />
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Admin link */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="mt-6 rounded-full bg-white/20 px-6 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/30"
          >
            Panel de Administración
          </button>
        )}
      </div>
    </div>
  );
}
