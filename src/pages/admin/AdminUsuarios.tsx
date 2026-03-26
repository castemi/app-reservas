import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export default function AdminUsuarios() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['admin_users', search, page],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*', { count: 'exact' });
      if (search.length >= 2) {
        const safe = search.replace(/[%_(),]/g, '');
        query = query.or(`nombre.ilike.%${safe}%,email.ilike.%${safe}%`);
      }
      const { data, error, count } = await query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { profiles: data, count: count || 0 };
    },
  });

  // Fetch roles for displayed users
  const userIds = data?.profiles?.map((p) => p.id) || [];
  const { data: roles } = useQuery({
    queryKey: ['admin_user_roles', userIds],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*').in('user_id', userIds);
      if (error) throw error;
      return data;
    },
  });

  const getRoles = (userId: string) => roles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];

  // Make admin mutation
  const makeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_user_roles'] });
      toast({ title: 'Rol actualizado', description: 'El usuario ahora es administrador.' });
    },
    onError: () => {
      toast({ title: 'Error', variant: 'destructive' });
    },
  });

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  return (
    <div className="px-4 py-4 space-y-4">
      <Input
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
      />

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {data?.profiles?.map((profile) => {
            const userRoles = getRoles(profile.id);
            const isAdmin = userRoles.includes('admin');
            return (
              <div key={profile.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Avatar className="h-10 w-10">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {(profile.nombre || profile.email || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{profile.nombre || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
                    {isAdmin ? 'Admin' : 'Cliente'}
                  </Badge>
                  {!isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Shield className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Hacer administrador?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vas a otorgar permisos de administrador a <strong>{profile.nombre || profile.email}</strong>. 
                            Esta persona tendrá acceso completo al panel de administración. Esta acción no se puede deshacer fácilmente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => makeAdminMutation.mutate(profile.id)}>Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
