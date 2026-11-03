-- Operator-managed Supabase Storage setup; not run by the agent.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='shipping-evidence' AND public=true) THEN
   RAISE EXCEPTION 'Existing shipping-evidence bucket is public; review before proceeding';
 END IF;
END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('shipping-evidence','shipping-evidence',false,2097152,ARRAY['image/jpeg']) ON CONFLICT(id) DO NOTHING;
-- Restrictive policies also protect this bucket if an older permissive policy
-- happens to allow all buckets. Backend service_role is the only accessor.
CREATE POLICY shipping_evidence_server_only ON storage.objects AS RESTRICTIVE
FOR ALL TO anon,authenticated USING(bucket_id<>'shipping-evidence') WITH CHECK(bucket_id<>'shipping-evidence');
COMMIT;
