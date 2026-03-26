-- Fix 1: Restringir tabla business_settings y crear política de columnas
-- Primero, eliminamos la política permisiva general (si existe)
DROP POLICY IF EXISTS "Anyone can view business settings" ON public.business_settings;

-- Luego, creamos una política para que SOLO admins puedan ver y editar TODOS los campos 
-- (asumiendo que ya hay políticas para admin, si no, creamos una de SELECT para admins)
CREATE POLICY "Admins can view all business settings"
ON public.business_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Revocar permisos SELECT generales en la tabla para invitados y logueados
REVOKE SELECT ON public.business_settings FROM anon, authenticated;

-- Otorgar permiso SELECT explícito SOLO para las columnas NO sensibles
GRANT SELECT (
  id, 
  nombre, 
  email_contacto, 
  telefono, 
  direccion, 
  horario_apertura, 
  horario_cierre, 
  dias_laborables, 
  created_at, 
  updated_at
) ON public.business_settings TO anon, authenticated;

-- Para que puedan obtener los datos permitidos, creamos una política de SELECT sin restricciones (la restricción de columnas ya actúa a nivel de GRANT)
CREATE POLICY "Users can view non-sensitive business settings" 
ON public.business_settings FOR SELECT 
USING (true);


-- Fix 2: Habilitar RLS en day_schedules y restringir permisos
ALTER TABLE public.day_schedules ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado/anónimo puede VER los horarios
CREATE POLICY "Anyone can view day schedules" 
ON public.day_schedules FOR SELECT 
USING (true);

-- Solo los Administradores pueden INSERTAR nuevos horarios
CREATE POLICY "Admins can insert day schedules" 
ON public.day_schedules FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Solo los Administradores pueden ACTUALIZAR horarios
CREATE POLICY "Admins can update day schedules" 
ON public.day_schedules FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Solo los Administradores pueden ELIMINAR horarios
CREATE POLICY "Admins can delete day schedules" 
ON public.day_schedules FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));
