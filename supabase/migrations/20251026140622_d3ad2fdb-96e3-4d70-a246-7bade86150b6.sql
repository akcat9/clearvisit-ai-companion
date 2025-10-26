-- Create a function to validate recipient email exists in profiles
CREATE OR REPLACE FUNCTION public.validate_shared_visit_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if recipient email exists in profiles table
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = NEW.recipient_email
  ) THEN
    RAISE EXCEPTION 'Recipient email % is not registered in the system', NEW.recipient_email;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate recipient email before insert
DROP TRIGGER IF EXISTS validate_recipient_email ON public.shared_visits;
CREATE TRIGGER validate_recipient_email
  BEFORE INSERT ON public.shared_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shared_visit_recipient();