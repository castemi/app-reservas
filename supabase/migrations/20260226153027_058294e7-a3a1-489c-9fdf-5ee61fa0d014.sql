
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');

-- Enum para estado de citas
CREATE TYPE public.appointment_status AS ENUM ('programada', 'completada', 'cancelada');

-- Tabla profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Tabla services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  duracion_minutos INTEGER NOT NULL,
  precio NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  fecha_hora TIMESTAMPTZ NOT NULL,
  estado appointment_status NOT NULL DEFAULT 'programada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla business_settings
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'Barbería El Corte Fino',
  direccion TEXT NOT NULL DEFAULT 'Calle Inventada 123',
  telefono TEXT NOT NULL DEFAULT '555-1234',
  email_contacto TEXT NOT NULL DEFAULT 'info@elcortefino.com',
  horario_apertura TIME NOT NULL DEFAULT '09:00',
  horario_cierre TIME NOT NULL DEFAULT '20:00',
  dias_laborables INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Función has_role (SECURITY DEFINER para evitar recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Función update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para appointments
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para business_settings
CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  -- Asignar rol de cliente por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS ============

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- SERVICES (public read, admin write)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services"
ON public.services FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage services"
ON public.services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- APPOINTMENTS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can create own appointments"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can update own appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete appointments"
ON public.appointments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- BUSINESS_SETTINGS (public read, admin write)
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view business settings"
ON public.business_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage business settings"
ON public.business_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket para imágenes de servicios
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true);

CREATE POLICY "Anyone can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Admins can upload service images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));
