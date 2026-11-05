-- Explicit opt-in after installing the API/worker on the confirmed TEST project.
-- Enabled source + alert publication share a transaction. Queue failure rolls
-- back that source INSERT. This does not make the whole checkout atomic.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.orders ENABLE TRIGGER ops_automation_order_created;
ALTER TABLE public.contacts ENABLE TRIGGER ops_automation_contact_created;
COMMIT;
