
-- Fix Security Definer Views: Add security_invoker=true to all views missing it

ALTER VIEW public.vw_lancamentos_consolidados SET (security_invoker = true);
ALTER VIEW public.v_month_profit_paid SET (security_invoker = true);
ALTER VIEW public.v_month_summary_v2 SET (security_invoker = true);
ALTER VIEW public.v_month_summary SET (security_invoker = true);
ALTER VIEW public.v_prolabore_mvp SET (security_invoker = true);
ALTER VIEW public.v_month_summary_canon SET (security_invoker = true);
ALTER VIEW public.v_financial_competencia SET (security_invoker = true);
