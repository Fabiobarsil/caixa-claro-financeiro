-- Add audit columns to entry_schedules
ALTER TABLE public.entry_schedules 
ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS previous_status text;

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own entry_schedules" ON public.entry_schedules;

-- Policy: Users can mark their own pending schedules as paid (but cannot revert)
CREATE POLICY "Users can mark pending as paid"
ON public.entry_schedules
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND status = 'pendente'
)
WITH CHECK (
  status = 'pago'
);

-- Policy: Admins can update any status (including revert)
CREATE POLICY "Admins can update any schedule status"
ON public.entry_schedules
FOR UPDATE
USING (is_admin())
WITH CHECK (true);