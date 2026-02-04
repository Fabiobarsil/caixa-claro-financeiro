-- Remove the existing constraint on plan_type
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_type_check;

-- Add new constraint that includes 'owner' for system administrators
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_type_check 
  CHECK (plan_type IN ('free', 'paid', 'owner'));