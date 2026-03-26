
-- 1. Create public view excluding Stripe-sensitive columns
CREATE OR REPLACE VIEW public.business_settings_public AS
SELECT
  id, nombre, tipo_negocio, instagram_url, direccion, telefono, email_contacto,
  horario_apertura, horario_cierre, dias_laborables,
  logo_url, background_url,
  created_at, updated_at
FROM public.business_settings;

-- Grant access to the view for authenticated and anon roles
GRANT SELECT ON public.business_settings_public TO authenticated;
GRANT SELECT ON public.business_settings_public TO anon;

-- 2. Drop the permissive "anyone can view" policy on the base table
DROP POLICY IF EXISTS "Anyone can view business settings" ON public.business_settings;

-- 3. Fix search_path on get_available_slots
CREATE OR REPLACE FUNCTION public.get_available_slots(p_date date, p_service_id uuid)
 RETURNS TABLE(available_time time without time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_service_duration int;
  v_day_of_week int;
  v_shift RECORD;
  v_current_time timestamp;
  v_closing_time timestamp;
  v_last_slot timestamp;
  v_slot_end timestamp;
  v_conflict boolean;
  v_blocked boolean;
BEGIN
  SELECT duracion_minutos INTO v_service_duration
  FROM public.services WHERE id = p_service_id;
  IF v_service_duration IS NULL THEN RETURN; END IF;
  v_day_of_week := extract(dow from p_date);
  FOR v_shift IN
    SELECT hora_inicio, hora_fin FROM public.day_schedules
    WHERE day_of_week = v_day_of_week AND activo = true ORDER BY hora_inicio
  LOOP
    v_current_time := p_date + v_shift.hora_inicio;
    v_closing_time := p_date + v_shift.hora_fin;
    v_last_slot := v_closing_time - (v_service_duration || ' minutes')::interval;
    WHILE v_current_time <= v_last_slot LOOP
      v_slot_end := v_current_time + (v_service_duration || ' minutes')::interval;
      IF v_current_time < now() THEN
        v_current_time := v_current_time + interval '30 minutes';
        CONTINUE;
      END IF;
      SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.estado != 'cancelada'
        AND a.fecha_hora < v_slot_end
        AND (a.fecha_hora + (s.duracion_minutos || ' minutes')::interval) > v_current_time
      ) INTO v_conflict;
      SELECT EXISTS (
        SELECT 1 FROM public.blocked_slots b
        WHERE b.fecha = p_date
        AND (
          (b.hora_inicio IS NULL OR b.hora_fin IS NULL)
          OR (v_current_time < (p_date + b.hora_fin) AND (p_date + b.hora_inicio) < v_slot_end)
        )
      ) INTO v_blocked;
      IF NOT v_conflict AND NOT v_blocked THEN
        available_time := v_current_time::time;
        RETURN NEXT;
      END IF;
      v_current_time := v_current_time + interval '30 minutes';
    END LOOP;
  END LOOP;
END;
$function$;

-- 4. Fix search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
