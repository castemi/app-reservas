
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS tipo_negocio text DEFAULT 'Barbería',
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS background_url text;

-- Create storage bucket for business assets
INSERT INTO storage.buckets (id, name, public) VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read, admins can upload/update/delete
CREATE POLICY "Public read business-assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'business-assets');
CREATE POLICY "Admins can upload business-assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update business-assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'business-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete business-assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'business-assets' AND public.has_role(auth.uid(), 'admin'));
