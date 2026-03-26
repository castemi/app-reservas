-- =====================================================
-- FINE-CUT SCHEDULER - SCHEMA COMPLETO DE BASE DE DATOS
-- =====================================================
-- Este archivo contiene el esquema completo de la base de datos
-- incluyendo tablas, enums, funciones, triggers y políticas RLS

-- =====================================================
-- 1. EXTENSIONES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. ENUMS (TIPOS PERSONALIZADOS)
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');
CREATE TYPE public.appointment_status AS ENUM ('programada', 'completada', 'cancelada');

-- =====================================================
-- 3. TABLAS
-- =====================================================

-- Tabla: profiles
-- Almacena información adicional de usuarios
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text,
  email text,
  telefono text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: user_roles
-- Sistema de roles separado (NUNCA usar columna role en profiles)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Tabla: business_settings
-- Configuración global de la barbería
CREATE TABLE public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT 'Barbería El Corte Fino',
  email_contacto text NOT NULL DEFAULT 'info@elcortefino.com',
  telefono text NOT NULL DEFAULT '555-1234',
  direccion text NOT NULL DEFAULT 'Calle Inventada 123',
  horario_apertura time NOT NULL DEFAULT '09:00:00',
  horario_cierre time NOT NULL DEFAULT '20:00:00',
  dias_laborables integer[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
  stripe_account_id text,
  stripe_customer_id text,
  subscription_status text DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: services
-- Catálogo de servicios ofrecidos
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio numeric NOT NULL,
  duracion_minutos integer NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: day_schedules
-- Horarios específicos por día de la semana (permite turnos partidos)
CREATE TABLE public.day_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tabla: blocked_slots
-- Bloqueos manuales de horarios
CREATE TABLE public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  hora_inicio time,
  hora_fin time,
  motivo text DEFAULT '',
  service_id uuid REFERENCES public.services(id),
  created_at timestamptz DEFAULT now()
);

-- Tabla: appointments
-- Reservas de citas
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  fecha_hora timestamptz NOT NULL,
  estado appointment_status NOT NULL DEFAULT 'programada',
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: notifications
-- Notificaciones in-app
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: email_campaigns
-- Campañas de email marketing
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asunto text NOT NULL,
  mensaje text NOT NULL,
  tipo text NOT NULL, -- 'inmediata', 'programada', 'automatizada'
  target text NOT NULL DEFAULT 'todos',
  estado text NOT NULL DEFAULT 'pendiente',
  fecha_programada timestamptz,
  dias_post_cita integer,
  created_at timestamptz DEFAULT now()
);

-- Tabla: push_campaigns (OBSOLETA - mantener solo para compatibilidad)
CREATE TABLE public.push_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  tipo text NOT NULL,
  target text NOT NULL DEFAULT 'todos',
  estado text NOT NULL DEFAULT 'pendiente',
  fecha_programada timestamptz,
  dias_post_cita integer,
  created_at timestamptz DEFAULT now()
);

-- Tabla: push_subscriptions (OBSOLETA - mantener solo para compatibilidad)
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabla: email_send_log
-- Log de envíos de email
CREATE TABLE public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template_name text NOT NULL,
  status text NOT NULL,
  message_id text,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: email_send_state
-- Estado del sistema de envío de emails
CREATE TABLE public.email_send_state (
  id integer PRIMARY KEY DEFAULT 1,
  batch_size integer NOT NULL DEFAULT 10,
  send_delay_ms integer NOT NULL DEFAULT 200,
  auth_email_ttl_minutes integer NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes integer NOT NULL DEFAULT 60,
  retry_after_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- Tabla: email_unsubscribe_tokens
-- Tokens para unsubscribe de emails
CREATE TABLE public.email_unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: suppressed_emails
-- Lista de emails suprimidos (bounces, spam complaints)
CREATE TABLE public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. FUNCIONES DE BASE DE DATOS
-- =====================================================

-- Función: has_role
-- Verifica si un usuario tiene un rol específico (SECURITY DEFINER para evitar recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función: get_available_slots
-- Calcula los slots de tiempo disponibles para una fecha y servicio
CREATE OR REPLACE FUNCTION public.get_available_slots(
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

  -- Día de la semana (0=Domingo)
  v_day_of_week := extract(dow from p_date);

  -- Iterar sobre cada turno del día
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
      
      -- Si el slot ya pasó
      IF v_current_time < now() THEN
        v_current_time := v_current_time + interval '30 minutes';
        CONTINUE;
      END IF;

      -- Verificar conflictos con citas existentes
      SELECT EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.estado != 'cancelada'
        AND a.fecha_hora < v_slot_end
        AND (a.fecha_hora + (s.duracion_minutos || ' minutes')::interval) > v_current_time
      ) INTO v_conflict;

      -- Verificar bloqueos manuales
      SELECT EXISTS (
        SELECT 1 FROM public.blocked_slots b
        WHERE b.fecha = p_date
        AND (
          (b.hora_inicio IS NULL OR b.hora_fin IS NULL)
          OR (
            v_current_time < (p_date + b.hora_fin)
            AND (p_date + b.hora_inicio) < v_slot_end
          )
        )
      ) INTO v_blocked;

      -- Si no hay conflicto, devolver el slot
      IF NOT v_conflict AND NOT v_blocked THEN
        available_time := v_current_time::time;
        RETURN NEXT;
      END IF;

      v_current_time := v_current_time + interval '30 minutes';
    END LOOP;
  END LOOP;
END;
$$;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger: actualizar updated_at en profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - PROFILES
-- =====================================================
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR id = auth.uid());

-- =====================================================
-- POLÍTICAS RLS - USER_ROLES
-- =====================================================
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - BUSINESS_SETTINGS
-- =====================================================
CREATE POLICY "Anyone can view business settings"
ON public.business_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage business settings"
ON public.business_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - SERVICES
-- =====================================================
CREATE POLICY "Anyone can view services"
ON public.services FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage services"
ON public.services FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - DAY_SCHEDULES
-- =====================================================
CREATE POLICY "Anyone can view day schedules"
ON public.day_schedules FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert day schedules"
ON public.day_schedules FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update day schedules"
ON public.day_schedules FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete day schedules"
ON public.day_schedules FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - BLOCKED_SLOTS
-- =====================================================
CREATE POLICY "Anyone can view blocked slots"
ON public.blocked_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert blocked slots"
ON public.blocked_slots FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blocked slots"
ON public.blocked_slots FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blocked slots"
ON public.blocked_slots FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - APPOINTMENTS
-- =====================================================
CREATE POLICY "Clients can view own appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can create own appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can update own appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (client_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete appointments"
ON public.appointments FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - NOTIFICATIONS
-- =====================================================
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - EMAIL_CAMPAIGNS
-- =====================================================
CREATE POLICY "Admins can manage email campaigns"
ON public.email_campaigns FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email campaigns"
ON public.email_campaigns FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - PUSH_CAMPAIGNS (OBSOLETO)
-- =====================================================
CREATE POLICY "Admins can manage campaigns"
ON public.push_campaigns FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert campaigns"
ON public.push_campaigns FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================================================
-- POLÍTICAS RLS - PUSH_SUBSCRIPTIONS (OBSOLETO)
-- =====================================================
CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- POLÍTICAS RLS - EMAIL SYSTEM TABLES
-- =====================================================
CREATE POLICY "Service role can read send log"
ON public.email_send_log FOR SELECT
TO public
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert send log"
ON public.email_send_log FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update send log"
ON public.email_send_log FOR UPDATE
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage send state"
ON public.email_send_state FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read tokens"
ON public.email_unsubscribe_tokens FOR SELECT
TO public
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert tokens"
ON public.email_unsubscribe_tokens FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can mark tokens as used"
ON public.email_unsubscribe_tokens FOR UPDATE
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read suppressed emails"
ON public.suppressed_emails FOR SELECT
TO public
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert suppressed emails"
ON public.suppressed_emails FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- 7. ÍNDICES (OPCIONAL - para optimización)
-- =====================================================
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_fecha_hora ON public.appointments(fecha_hora);
CREATE INDEX idx_appointments_estado ON public.appointments(estado);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_leida ON public.notifications(leida);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_blocked_slots_fecha ON public.blocked_slots(fecha);

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
