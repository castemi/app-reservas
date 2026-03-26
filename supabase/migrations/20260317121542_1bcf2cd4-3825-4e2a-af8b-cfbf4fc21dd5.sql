
-- Fix: set view to use invoker's permissions, not definer's
ALTER VIEW public.business_settings_public SET (security_invoker = on);
