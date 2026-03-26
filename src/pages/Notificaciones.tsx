import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/PageHeader';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Notificaciones() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ leida: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ leida: true })
        .eq('user_id', user!.id)
        .eq('leida', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const unreadCount = notifications.filter((n) => !n.leida).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader title="Notificaciones" />

      {unreadCount > 0 && (
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={() => markAllRead.mutate()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Marcar todas como leídas
          </button>
        </div>
      )}

      <div className="flex-1 px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Bell className="h-12 w-12" />
            <p className="text-sm">No tienes notificaciones</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => !n.leida && markRead.mutate(n.id)}
                className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                  n.leida
                    ? 'border-border bg-background text-muted-foreground'
                    : 'border-primary/20 bg-primary/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.leida && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.leida ? 'font-normal' : 'font-semibold text-foreground'}`}>
                      {n.titulo}
                    </p>
                    <p className={`mt-1 text-xs ${n.leida ? '' : 'text-foreground/80'}`}>
                      {n.mensaje}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {format(new Date(n.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
