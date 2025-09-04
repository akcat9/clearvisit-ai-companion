-- Create a secure function to check if an email exists
-- Uses SECURITY DEFINER to bypass RLS policies while maintaining security
CREATE OR REPLACE FUNCTION public.check_email_exists(email_address text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = email_address
  );
$$;