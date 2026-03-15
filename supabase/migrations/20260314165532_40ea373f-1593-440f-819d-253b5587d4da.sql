
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asunto text NOT NULL,
  mensaje text NOT NULL,
  tipo text NOT NULL,
  target text NOT NULL DEFAULT 'todos',
  estado text NOT NULL DEFAULT 'pendiente',
  fecha_programada timestamptz,
  dias_post_cita integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email campaigns"
  ON public.email_campaigns
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email campaigns"
  ON public.email_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
