-- Additive TEST DB rollout only. Do not auto-apply or claim draft policies approved.
-- Apply before LEGAL_CONSENT_ENFORCED=true and deploy the matching web/API.
BEGIN;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS legal_acceptance jsonb;
-- Old contacts stay NULL; never backfill invented consent.
COMMENT ON COLUMN public.contacts.legal_acceptance IS
  'Purpose/version/server-recorded timestamp of supplied consent; NULL is not proof of consent.';
COMMIT;
-- Pause: LEGAL_CONSENT_ENFORCED=false + restart API. Preserve receipts and column.
-- Existing contact RLS and grants are unchanged. Verify they remain private.
