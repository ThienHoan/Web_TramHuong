# Admin functional review — 2026-11-01

Reviewed dashboard, orders and order details, products and product editor, categories, users and user details, journal and journal editor, contacts, vouchers and voucher editor. Reviewed frontend/API contracts, admin authentication readiness and API guards. No authenticated browser session or live database mutations were used.

## Required database change

Apply `apps/api/migrations/admin-order-integrity.sql` in Supabase SQL Editor before restarting the updated API. It installs a transaction function and an order trigger: validates transitions, restores inventory on cancellation/expiry inside the same transaction, and synchronizes payment status when marked paid. The function is restricted to service_role. Admin updates use compare-and-set semantics; expiration skips orders that have already changed. Without the migration, status updates fail explicitly instead of performing an incomplete stock update.

The user reported applying the initial SQL. A nonmatching sentinel RPC probe then found PostgreSQL error 42883 (`order_status = text`); the migration was corrected to use the actual column type via jsonb_populate_record and compare status::text. The user subsequently reported successfully applying the corrected migration. Two follow-up sentinel RPC probes timed out (12s and 20s), so runtime verification of the corrected function remains pending. No real order was changed by the probe. Successful order/stock transactions have NOT been integration-tested in this environment. Docker is installed but its daemon is unavailable. Test on a disposable database first: concurrent cancellation restores stock once; paid-vs-expired updates admit one valid transition; a failed product update rolls back the order transition and all stock changes; terminal orders reject further transitions.

## Changes

- Wait for auth/profile before mounting admin children; protected API routes for draft posts and inactive products/categories.
- Blog DTO matches cover_image/is_featured, allows automatic slugs; editor sends editable fields only; lists paginate and report failures.
- Voucher DTO accepts the form amount alias; update maps the alias to the actual database column; validates percentage and date order.
- Product creation supports numeric multipart strings; saves decimal prices correctly; validates nonnegative prices, integral stock and discount bounds; category removal clears category_id.
- User role/ban operations validate types and existence, prevent self-demotion/self-ban, and show API errors in the UI.
- Normalize pagination and reject invalid values; contact listing paginates and validates status updates.
- Order dropdown only offers valid next states. Email fallback retains existing shipping details. Expiry lookup no longer queries a nonexistent expired_at column.

## Validation limits

TypeScript, targeted frontend ESLint and mocked backend regression tests validate source behavior. Browser workflows with a real admin login, database constraints/RLS, concurrent transactions and actual email delivery require environment validation after applying the SQL. No claim that these live flows have already passed.
