# Thiên Phúc admin workspace

The admin now uses a shared store-operations shell and one list component across orders, products, categories, customers, journal, contacts and discounts. Dashboard provides current work queues, reporting periods, revenue/status charts, recent orders and best sellers. Keeps the existing green brand, uses existing shadcn/Radix controls and Recharts.

## Lists

`AdminResourcePage` and `useAdminList` provide debounced search, resource filters, Vietnam calendar dates, allowlisted sorting, page numbers, 10/20/50 rows, total counts, refresh, loading/empty/error states, quick view and confirmation dialogs. All list selection is represented in the URL and restored when returning from details. A filter or page-size change returns to page 1. Saved views are limited to eight per user/resource in this browser's localStorage (not synced across devices). Product bulk visibility applies only to selected rows on the current page. No automatic order mutations occur while viewing a list.

`GET /api/admin/resources/:resource` and `/export` are authenticated ADMIN/STAFF endpoints. The existing mutation APIs retain their own role checks; only ADMIN can change roles or ban accounts. Unsupported resources, sort fields, status values, invalid dates and pagination are rejected. Search terms are escaped before PostgREST filters. Text and embedded translation search, category/stock filters and inclusive Vietnam date boundaries run on the server before pagination. Voucher availability that compares usage columns scans all candidate pages on the server before calculating totals; it is not a filter on only the displayed page.

Exports apply the same filters and sorting to every matching page, up to 10,000 results. Larger exports ask the user to narrow filters. CSV cells are quoted and spreadsheet formula prefixes neutralized. Accounting stays in VND for Vietnamese and English admin views.

## Dashboard

Work queue counts use exact database counts and link to matching filtered lists. Period reports are distinct from storewide work queues. Revenue reads all order pages, excludes canceled/expired/refunded orders, and includes AWAITING_PAYMENT/EXPIRED in status distribution. Charts are lazy loaded with motion disabled. Storefront header/chat/smooth scrolling are omitted on admin routes.

## Validation

53 backend tests pass, including real HTTP guard integration with mocked identities, date bounds, full-dataset pagination/lifecycle, filtered CSV exports and formula escaping. TypeScript and targeted ESLint pass. Read-only integration probes have exercised all seven resources, translated product/category searches, order searches, voucher lifecycle filters and operations counts against the configured database; no records or secrets are printed.

Isolated Chromium QA uses fixtures with all API requests intercepted, covering eight desktop screens, mobile overflow/navigation, pagination reset, saved filters, quick view, current-page bulk visibility, CSV download, and empty/error states. It performs no live mutations. Production browser workflows still use the real account and backend guard.

No additional SQL migration or third-party service is needed for this UI upgrade. The API was rebuilt and its existing localhost process restarted. Both the backend and frontend proxy return 401 for unauthenticated requests to the new routes, confirming they are loaded and guarded. Future backend changes require rebuild/restart when running without watch mode. The earlier order-integrity SQL remains required for order status mutations.
