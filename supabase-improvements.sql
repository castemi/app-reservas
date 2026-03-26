-- Optimización de la base de datos Supabase para Fine-Cut Scheduler
-- Para ejecutar esto, ve a la sección "SQL Editor" en el panel de control de Supabase.

-- 1. Modificar tabla blocked_slots para poder asignarlo a un empleado/servicio si es necesario en el futuro.
-- (Actualmente un bloqueo deshabilita toda la agenda, pero en un futuro con múltiples servicios o empleados será clave)
ALTER TABLE public.blocked_slots ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) NULL;

-- 2. Función de base de datos (RPC) para calcular huecos disponibles.
-- Esta función traslada la lógica exhaustiva del frontend al servidor (Supabase), 
-- devolviendo solo los tramos de horas libres y ahorrando llamadas redundantes.
CREATE OR REPLACE FUNCTION get_available_slots(
  p_date date,
  p_service_id uuid
)
RETURNS TABLE (
  available_time time
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  -- Obtener duración del servicio
  SELECT duracion_minutos INTO v_service_duration
  FROM public.services
  WHERE id = p_service_id;

  IF v_service_duration IS NULL THEN
    RETURN;
  END IF;

  -- En Javascript DOW es 0=Sunday. En Postgres extract(dow) es 0=Sunday.
  v_day_of_week := extract(dow from p_date);

  -- Iterar sobre cada turno del día configurado en la base de datos
  FOR v_shift IN
    SELECT hora_inicio, hora_fin
    FROM public.day_schedules
    WHERE day_of_week = v_day_of_week AND activo = true
    ORDER BY hora_inicio
  LOOP
    v_current_time := p_date + v_shift.hora_inicio;
    v_closing_time := p_date + v_shift.hora_fin;
    v_last_slot := v_closing_time - (v_service_duration || ' minutes')::interval;

    WHILE v_current_time <= v_last_slot LOOP
      v_slot_end := v_current_time + (v_service_duration || ' minutes')::interval;
      
      -- Si el slot ya pasó (para hoy o días anteriores)
      IF v_current_time < now() THEN
        v_current_time := v_current_time + interval '30 minutes';
        CONTINUE;
      END IF;

      -- Verificar si hay citas que solapan
      SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.estado != 'cancelada'
        AND a.fecha_hora < v_slot_end
        AND (a.fecha_hora + (s.duracion_minutos || ' minutes')::interval) > v_current_time
      ) INTO v_conflict;

      -- Verificar si el horario está bloqueado (bloqueos manuales)
      SELECT EXISTS (
        SELECT 1 FROM public.blocked_slots b
        WHERE b.fecha = p_date
        AND 
        (
          -- Día completo bloqueado
          (b.hora_inicio IS NULL OR b.hora_fin IS NULL)
          OR
          -- Intersección en horario
          (
            v_current_time < (p_date + b.hora_fin)
            AND
            (p_date + b.hora_inicio) < v_slot_end
          )
        )
      ) INTO v_blocked;

      -- Si no hay conflicto y no está bloqueado, agregar a resultados
      IF NOT v_conflict AND NOT v_blocked THEN
        available_time := v_current_time::time;
        RETURN NEXT;
      END IF;

      -- Avanzar al siguiente tramo posible (30 mins de salto configurado)
      v_current_time := v_current_time + interval '30 minutes';
    END LOOP;
  END LOOP;
END;
$$;
