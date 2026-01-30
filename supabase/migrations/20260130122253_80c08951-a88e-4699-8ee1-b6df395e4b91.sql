-- Fix handle_subscription_creation to include account_id
-- The trigger must get account_id from the profile created by handle_new_user

CREATE OR REPLACE FUNCTION public.handle_subscription_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_account_id uuid;
BEGIN
  -- Get the account_id from the profile (created by handle_new_user trigger)
  SELECT account_id INTO profile_account_id 
  FROM public.profiles 
  WHERE user_id = NEW.id;
  
  -- Only create subscription if we have an account_id
  IF profile_account_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, account_id, first_activity_date)
    VALUES (NEW.id, profile_account_id, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_subscription_creation IS 'Creates initial subscription record when a new user is created. Gets account_id from profile created by handle_new_user trigger.';