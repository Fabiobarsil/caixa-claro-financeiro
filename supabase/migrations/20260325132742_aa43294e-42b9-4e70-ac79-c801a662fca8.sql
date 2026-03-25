
CREATE OR REPLACE VIEW public.v_received_cash
WITH (security_invoker = true)
AS
-- Standalone transactions (type='entrada', status='pago', with payment_date)
-- that do NOT have any entry_schedules
SELECT
  t.account_id,
  t.id AS source_id,
  NULL::uuid AS schedule_id,
  t.payment_date::date AS payment_date,
  t.amount,
  t.amount_paid,
  'transaction'::text AS source_type,
  t.client_id,
  t.description,
  t.payment_method
FROM public.transactions t
WHERE t.type = 'entrada'
  AND t.status = 'pago'
  AND t.payment_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.entry_schedules es WHERE es.entry_id = t.id
  )

UNION ALL

-- Entry schedules (paid installments/packages with paid_at)
SELECT
  es.account_id,
  es.entry_id AS source_id,
  es.id AS schedule_id,
  (es.paid_at AT TIME ZONE 'UTC')::date AS payment_date,
  es.amount,
  es.amount_paid,
  'schedule'::text AS source_type,
  t2.client_id,
  t2.description,
  t2.payment_method
FROM public.entry_schedules es
JOIN public.transactions t2 ON t2.id = es.entry_id
WHERE es.status = 'pago'
  AND es.paid_at IS NOT NULL;
