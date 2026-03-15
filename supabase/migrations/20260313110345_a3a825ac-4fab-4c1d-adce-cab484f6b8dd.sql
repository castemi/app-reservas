ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS stripe_session_id text;