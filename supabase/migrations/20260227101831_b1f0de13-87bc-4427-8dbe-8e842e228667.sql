CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, telefono)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'telefono');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente');
  RETURN NEW;
END;
$function$;