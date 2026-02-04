-- Add email tracking columns to webhook_events
ALTER TABLE public.webhook_events
ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_type text;

-- Add comment for documentation
COMMENT ON COLUMN public.webhook_events.email_sent IS 'Whether an email was sent for this event';
COMMENT ON COLUMN public.webhook_events.email_type IS 'Type of email sent: invite, notification, none';