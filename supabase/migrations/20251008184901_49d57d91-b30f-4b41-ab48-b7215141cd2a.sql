-- Fix remaining security issue: Add search_path to get_user_by_username function
CREATE OR REPLACE FUNCTION public.get_user_by_username(username_input text)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT user_id INTO user_uuid 
    FROM public.profiles 
    WHERE username = username_input 
    LIMIT 1;
    
    RETURN user_uuid;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_user_by_username: %', SQLERRM;
        RETURN NULL;
END;
$function$;