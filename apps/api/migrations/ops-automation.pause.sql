-- Pause producers first. Preserve queued/history rows and original triggers.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.orders DISABLE TRIGGER ops_automation_order_created;
ALTER TABLE public.contacts DISABLE TRIGGER ops_automation_contact_created;
COMMIT;
