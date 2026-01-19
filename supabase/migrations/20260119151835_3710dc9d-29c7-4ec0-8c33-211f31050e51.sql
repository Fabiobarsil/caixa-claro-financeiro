-- Permitir que admins vejam todos os profiles para gerenciar equipe
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (is_admin());

-- Permitir que admins vejam todos os roles para gerenciar equipe
CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (is_admin());