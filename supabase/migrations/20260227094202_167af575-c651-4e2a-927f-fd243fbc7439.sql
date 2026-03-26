
-- Create blocked_slots table
CREATE TABLE public.blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  hora_inicio time WITHOUT TIME ZONE,
  hora_fin time WITHOUT TIME ZONE,
  motivo text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

-- Everyone can view blocked slots (needed for availability calculation)
CREATE POLICY "Anyone can view blocked slots"
ON public.blocked_slots
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert blocked slots
CREATE POLICY "Admins can insert blocked slots"
ON public.blocked_slots
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update blocked slots
CREATE POLICY "Admins can update blocked slots"
ON public.blocked_slots
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete blocked slots
CREATE POLICY "Admins can delete blocked slots"
ON public.blocked_slots
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
