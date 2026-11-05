-- Stop new checkouts; preserve idempotency history and lookup for recovery.
-- Do not restore the old multi-request writer while new checkouts are in flight.
REVOKE EXECUTE ON FUNCTION public.checkout_create_order(uuid,uuid,text,jsonb,jsonb,text,text,numeric,numeric,numeric,jsonb) FROM service_role;
