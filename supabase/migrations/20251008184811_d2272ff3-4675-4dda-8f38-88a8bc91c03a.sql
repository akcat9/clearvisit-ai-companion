-- Fix security issue: Add search_path to functions
-- This prevents SQL injection attacks through search_path manipulation

-- Fix check_email_exists function
CREATE OR REPLACE FUNCTION public.check_email_exists(email_address text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = email_address
  );
$function$;

-- Fix log_auth_attempt function  
CREATE OR REPLACE FUNCTION public.log_auth_attempt(username_input text, success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Log authentication attempts for debugging (remove in production)
    RAISE LOG 'Auth attempt - Username: %, Success: %', username_input, success;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;