-- Create a trigger function to prevent account_id modification
-- This closes the security hole where users could change their account_id to access other accounts' data
CREATE OR REPLACE FUNCTION public.prevent_account_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If account_id was already set and someone tries to change it, block the operation
  IF OLD.account_id IS NOT NULL AND NEW.account_id IS DISTINCT FROM OLD.account_id THEN
    RAISE EXCEPTION 'Cannot modify account_id - this field is immutable after initial assignment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce immutability of account_id on profiles
DROP TRIGGER IF EXISTS prevent_account_id_change_trigger ON public.profiles;
CREATE TRIGGER prevent_account_id_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_account_id_change();