
-- Enable extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Push campaigns table
CREATE TABLE public.push_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('inmediata','programada','automatizada')),
  target text NOT NULL DEFAULT 'todos',
  fecha_programada timestamptz,
  dias_post_cita integer,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviada','cancelada')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON public.push_campaigns
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert campaigns" ON public.push_campaigns
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
