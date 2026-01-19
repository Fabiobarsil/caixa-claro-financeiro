-- Rename description to category and add notes column
ALTER TABLE public.expenses RENAME COLUMN description TO category;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes text;

-- Update RLS policies to be more explicit
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view expenses" ON public.expenses;

-- Users can view their own expenses
CREATE POLICY "Users can view own expenses"
ON public.expenses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own expenses
CREATE POLICY "Users can insert own expenses"
ON public.expenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own expenses
CREATE POLICY "Users can update own expenses"
ON public.expenses
FOR UPDATE
USING (auth.uid() = user_id);

-- Only admins can delete expenses
CREATE POLICY "Admins can delete expenses"
ON public.expenses
FOR DELETE
USING (is_admin() AND auth.uid() = user_id);