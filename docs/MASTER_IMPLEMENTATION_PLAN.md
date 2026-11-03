# MASTER IMPLEMENTATION PLAN
## TRAMHUONG SMART LOGISTICS — GHN API INTEGRATION

**Project:** Web_TramHuong  
**Version:** 1.0  
**Architecture:** Next.js 14 + NestJS + Supabase PostgreSQL  
**Shipping Provider:** Giao Hàng Nhanh (GHN)  
**Implementation Agent:** OpenAI Codex  
**Priority:** Production-ready, secure, extensible, maintainable

---

# 1. ROLE & MISSION

You are a Senior Full-Stack Engineer, Software Architect, and E-commerce Logistics Specialist.

Your task is to analyze the existing Web_TramHuong codebase and implement a comprehensive, production-ready shipping management system integrated with the official GHN Public API.

The system must support:

- Automated shipping quotes and delivery estimates.
- Address validation and normalization.
- Shipment creation and lifecycle management.
- Real-time shipment status updates.
- Customer shipment tracking.
- Admin logistics management.
- Warehouse and pickup management.
- Shipping exception handling.
- Customer support tickets.
- COD management and reconciliation.
- Shipping cost analytics.
- Automated notifications.
- Multi-provider extensibility.

The result must be a functional implementation integrated with the existing project, not an isolated demo.

**IMPORTANT: Do not rewrite the existing application. Extend it safely.**

# 2. MANDATORY RULES

Before modifying any source code:

1. Inspect the repository structure, package.json files, modules, database schema, migrations, services, API clients, checkout flow, order management, payment integration and UI architecture.
2. Identify existing features related to shipping, orders, addresses, payment, vouchers, customer profiles, admin dashboards, notifications and email.
3. Reuse existing abstractions wherever possible.
4. Do not introduce duplicate business logic, database tables or API endpoints.
5. Preserve the current Zen and Traditional interfaces.
6. Preserve existing authentication and authorization.
7. Preserve the existing SePay integration and payment lifecycle.
8. Do not modify payment, voucher or order state transitions without analyzing all related dependencies.
9. Never hardcode API tokens, secrets or credentials.
10. Never expose GHN tokens or privileged Supabase credentials to the browser.
11. Never create real GHN shipments during automated tests.
12. Never automatically switch from staging to production.
13. Never execute destructive database operations without explicit approval.
14. Never invent GHN endpoint capabilities or response schemas.
15. Implement features only when supported by verified documentation and accessible credentials.
16. Do not create Git commits or push to remote unless explicitly instructed.
17. Maintain backwards compatibility whenever possible.
18. Avoid introducing unnecessary dependencies or paid services.

Before implementation, produce an audit report containing:

- Current project architecture.
- Existing relevant modules.
- Database entities and relationships.
- Authentication and authorization approach.
- Existing shipping-related functionality.
- Reusable components and utilities.
- Identified risks.
- Proposed implementation changes.
- GHN capabilities verified against documentation.
- Any missing credentials, permissions or external dependencies.

Do not request sensitive credentials directly in chat or print their values in logs.

# 3. OFFICIAL GHN DOCUMENTATION

Start with:

https://developer.ghn.vn/vi/docs/getting-started/overview

Also inspect the linked documentation for:

- Authentication and ShopId.
- GHN environments.
- Province, district and ward APIs.
- New two-level administrative address APIs.
- Available services.
- Calculate shipping fee.
- Delivery leadtime.
- Preview order.
- Create order.
- Order information.
- Update order.
- Cancel order.
- Return order.
- Delivery again.
- Update COD.
- Print order.
- Actual shipping fees.
- Pickup shifts.
- Shop management.
- Order status webhook.
- COD webhook.
- Customer support tickets.
- Affiliate APIs.
- Status codes and reason codes.

For every GHN operation, document:

- HTTP method and endpoint.
- Authentication headers.
- Required request fields.
- Response schema.
- Validation constraints.
- Error codes.
- Applicable shipment states.
- Required account permissions.
- Retry and idempotency considerations.
- Staging availability.
- Rate limits, if officially documented.

Maintain the verified API inventory in:

`docs/shipping/ghn-api-capabilities.md`

Do not assume an API is usable merely because it appears in documentation. Mark unverified capabilities explicitly.

# 4. TARGET ARCHITECTURE

Use a modular architecture.

```text
Next.js Frontend
    |
    v
NestJS REST API
    |
    +-- ShippingModule
    |      |
    |      +-- Address Service
    |      +-- Quote Service
    |      +-- Shipment Service
    |      +-- Tracking Service
    |      +-- Warehouse Service
    |      +-- Pickup Service
    |      +-- COD Service
    |      +-- Ticket Service
    |      +-- Notification Service
    |      +-- Analytics Service
    |      +-- Webhook Processor
    |
    +-- Shipping Provider Interface
    |      |
    |      +-- GHN Adapter
    |      +-- Future GHTK Adapter
    |      +-- Future Viettel Post Adapter
    |
    v
Supabase PostgreSQL
    |
    +-- Shipments
    +-- Tracking Events
    +-- Shipping Quotes
    +-- Provider Configuration
    +-- Pickup Operations
    +-- COD Ledger
    +-- Support Tickets
    +-- Shipping Analytics
    +-- Webhook Inbox
```

Separate business logic from GHN-specific logic.

Define a provider contract similar to:

```typescript
interface ShippingProvider {
  getAvailableServices(
    input: AvailableServicesInput
  ): Promise<ShippingService[]>;

  calculateFee(
    input: ShippingQuoteInput
  ): Promise<ShippingQuote>;

  estimateDelivery(
    input: DeliveryEstimateInput
  ): Promise<DeliveryEstimate>;

  createShipment(
    input: CreateShipmentInput
  ): Promise<ShipmentResult>;

  getShipment(
    trackingCode: string
  ): Promise<ShipmentDetails>;

  cancelShipment(
    trackingCode: string
  ): Promise<ShipmentActionResult>;
}
```

Implement GHN as the first provider.

Provider-specific optional capabilities such as ticket creation, updating COD, scheduling pickup or requesting redelivery should use explicit capability interfaces instead of forcing unsupported methods onto future providers.

# 5. PHASE 1 — CORE SHIPPING FOUNDATION

**Priority: P0 — Mandatory**

## 5.1 GHN Configuration

Implement environment-based configuration for:

```env
GHN_ENABLED=false
GHN_ENV=staging
GHN_TOKEN=
GHN_SHOP_ID=
GHN_WEBHOOK_SECRET=
```

Only use configuration fields required by the verified integration.

Requirements:

- Validate configuration on startup.
- Prevent accidental production calls in development.
- Support staging and production separately.
- Never log secrets.
- Add example variables to `.env.example`.
- Do not overwrite existing `.env` files.

## 5.2 GHN HTTP Client

Create a reusable GHN client with:

- Typed request and response models.
- Centralized authentication headers.
- Configurable timeout.
- Safe error handling.
- Bounded retries for eligible operations.
- Exponential backoff.
- Structured logging.
- Correlation IDs.
- Error classification.
- Secret redaction.

Ensure mutations are never retried blindly.

## 5.3 Administrative Address Integration

Implement address lookup and validation using the GHN APIs.

Support:

- Province/city selection.
- Ward/commune selection.
- Legacy district/ward mappings where required.
- Address persistence.
- Delivery eligibility checking.
- Clear validation errors.

Important:

Support Vietnam's newer two-level administrative address system while maintaining compatibility with GHN endpoints that still require legacy location identifiers.

Do not derive provider IDs from names without verified mapping.

## 5.4 Shipping Calculator

Implement:

`POST /shipping/quote`

Input:

- Delivery destination.
- Items.
- Total weight.
- Package dimensions.
- Declared value.
- COD amount, when applicable.
- Shop or warehouse.
- Requested shipping service.

Output:

- Shipping provider.
- Available service.
- Actual quoted shipping fee.
- Estimated delivery date when available.
- Quote expiration.
- Relevant service restrictions.
- Quote reference.

Calculate package values from trusted server-side product data whenever possible.

Do not trust browser-submitted product prices or package weights.

## 5.5 Order Preview

Implement GHN Preview Order to validate shipment information before creating a shipping order.

Requirements:

- Validate recipient.
- Validate address.
- Validate product details.
- Validate COD requirements.
- Validate declared value.
- Check shipping restrictions.
- Handle GHN validation errors.
- Do not create shipments during preview.

## 5.6 Checkout Integration

Integrate shipping quotes into both existing storefront experiences:

- Zen UI.
- Traditional UI.

Checkout should:

1. Collect address.
2. Resolve supported GHN location codes.
3. Calculate shipping.
4. Display delivery estimate.
5. Apply shipping discounts.
6. Calculate final order total.
7. Show errors clearly.
8. Revalidate the quote server-side before order submission.

Preserve existing voucher, payment and order validation behavior.

### Phase 1 Acceptance Criteria

- GHN staging integration works.
- No credentials are exposed.
- Customer can obtain a valid shipping quote.
- Shipping fee is included correctly in order totals.
- Existing checkout and payment flows remain functional.
- Invalid addresses and unsupported delivery routes are handled.
- Both storefront themes work.
- Relevant unit and integration tests pass.

# 6. PHASE 2 — AUTOMATED FULFILLMENT

**Priority: P0 — Mandatory**

## 6.1 Shipment Lifecycle

Implement creation and management of GHN shipments linked to internal orders.

Use a strict state machine:

```text
ORDER_CONFIRMED
       |
       v
READY_FOR_FULFILLMENT
       |
       v
SHIPMENT_PENDING
       |
       v
SHIPMENT_CREATED
       |
       v
PICKUP_PENDING
       |
       v
IN_TRANSIT
       |
       v
OUT_FOR_DELIVERY
       |
       v
DELIVERED
```

Support separate exception paths:

```text
DELIVERY_FAILED
RETURN_REQUESTED
RETURNING
RETURNED
CANCEL_REQUESTED
CANCELLED
MANUAL_REVIEW
```

These are internal normalized states. Do not assume they correspond exactly to GHN status codes.

Keep commercial order status, payment status and shipping status separate.

## 6.2 Safe Shipment Creation

Create a shipment only after the existing business rules allow fulfillment.

Requirements:

- Idempotent creation.
- Deterministic unique `client_order_code`.
- Transaction-safe local workflow.
- No duplicate GHN shipments.
- Recover safely from timeouts.
- Store external order code.
- Store shipping fees.
- Store COD amount.
- Store provider response metadata.
- Store creation timestamp.

If GHN returns an uncertain outcome, reconcile using the order lookup API before creating another shipment.

## 6.3 Admin Shipping Operations

Implement administrative actions for:

- Create shipment.
- View shipment.
- Update eligible details.
- Cancel shipment.
- Request return.
- Request redelivery.
- Update COD, when permitted.
- Refresh shipment state.
- Print shipping label.

Check provider state and permissions before every mutation.

Record an audit trail for sensitive operations.

## 6.4 Shipping Label Management

Implement:

- Single-label printing.
- Batch-label printing.
- Selected-order printing.
- Downloadable label links where supported.
- Printing error reporting.
- Retry for failed batches.

Respect documented GHN batch limits.

## 6.5 Pickup Management

Implement:

- Available pickup shifts.
- Pickup scheduling during shipment creation.
- Pickup queue.
- Warehouse preparation status.
- Batch handover workflow.

Refresh date-dependent pickup shift identifiers rather than hardcoding them.

### Phase 2 Acceptance Criteria

- Eligible internal orders can create GHN staging shipments.
- Duplicate requests do not create duplicate shipments.
- Admin can manage supported shipment actions.
- Shipping labels can be generated.
- Pickup information is correctly persisted.
- State transitions are validated.
- All critical actions generate audit records.

# 7. PHASE 3 — REAL-TIME CUSTOMER TRACKING

**Priority: P1 — High**

## 7.1 GHN Webhook Receiver

Implement secure webhook endpoints, including:

`POST /shipping/webhooks/ghn`

Requirements:

- Validate a configured shared authentication mechanism.
- Validate payload schema.
- Record raw metadata safely.
- Ensure idempotent ingestion.
- Return acknowledgment promptly.
- Process events asynchronously where applicable.
- Handle duplicated events.
- Handle delayed events.
- Handle out-of-order events.
- Support retries and dead-letter recovery.
- Never silently discard unknown event types.

Map GHN status and reason codes into internal states.

Do not assume the provider's webhook signing mechanism. Follow the officially verified mechanism, and use additional network controls if appropriate.

## 7.2 Shipment Tracking

Expose:

`GET /shipping/track/:orderId`

Requirements:

- Enforce ownership and authorization.
- Return sanitized customer-facing data.
- Include tracking code.
- Include current shipping status.
- Include historical milestones.
- Include delivery estimate where available.
- Include delivery confirmation only when verified.
- Exclude internal credentials and restricted carrier information.

## 7.3 Supabase Realtime

Use Supabase Realtime to notify authorized clients when a shipment changes.

Requirements:

- Enforce row-level access policies where applicable.
- Never expose privileged tables to anonymous subscriptions.
- Support reconnect and refetch.
- Provide a non-realtime fallback.
- Avoid polling GHN continuously.

## 7.4 Customer UI

Create a premium shipment tracking experience.

Zen design:

- Minimal typography.
- Neutral luxury palette.
- Subtle animations.
- Spacious layout.
- Clear progress timeline.

Traditional design:

- Vietnamese cultural presentation.
- Warm colors.
- Traditional styling.
- Same functional capabilities.

Customer tracking should show:

- Current delivery stage.
- Timeline.
- Estimated arrival.
- Shipping carrier.
- Tracking number.
- Relevant notifications.
- Customer support action.

## 7.5 Optional Map

Build a map feature only when useful.

Possible capabilities:

- Display origin and destination locations.
- Display an estimated route using a separate map provider.
- Display known shipping locations when permitted.

Restrictions:

- Never fabricate courier GPS.
- Never describe an estimated route as the package's actual path.
- Do not expose full recipient address publicly.
- Do not require paid maps as a dependency for core tracking.
- Keep mapping behind an optional feature flag.

### Phase 3 Acceptance Criteria

- Webhooks correctly update shipment states.
- Customers see their own tracking information.
- Realtime updates work.
- Unauthorized users cannot read another customer's shipment.
- Unknown provider fields do not crash the UI.
- Missing GPS data is handled truthfully.
- Zen and Traditional tracking screens are responsive.

# 8. PHASE 4 — SHIPPING EXCEPTION AUTOMATION

**Priority: P1 — High**

Develop an exception handling center for operations staff.

## 8.1 Failure Detection

Detect:

- Delivery failures.
- Unusual shipping delays.
- Return initiated.
- Return completed.
- Shipment cancellation.
- Unexpected status transitions.
- Shipping fee modifications.
- COD changes.
- Package weight changes.
- Missing tracking events.

## 8.2 Exception Workflow

For each issue:

1. Create an internal exception record.
2. Assign severity.
3. Identify responsible staff.
4. Recommend permitted actions.
5. Notify relevant users.
6. Record resolution attempts.
7. Close only when an appropriate completion condition is met.

## 8.3 Redelivery Workflow

Support GHN Delivery Again API.

Only offer redelivery when:

- The external shipment state supports it.
- GHN API requirements are satisfied.
- Internal business rules permit it.
- Necessary approvals have been obtained.

## 8.4 Return Workflow

Support:

- Customer return request.
- Admin review.
- GHN return request when supported.
- Return tracking.
- Receiving and inspecting returned goods.
- Linking return results to the order.

Do not automatically issue payment refunds merely because GHN reports a returned shipment.

Payment refund logic must follow the existing payment system and approval rules.

## 8.5 Alert Center

Implement notifications for:

- Delivery failed.
- Order delayed.
- Redelivery requested.
- Return received.
- Shipping fee changed.
- Manual review required.

### Phase 4 Acceptance Criteria

- Failed deliveries generate actionable admin alerts.
- Redelivery follows GHN eligibility rules.
- Return operations are traceable.
- No automatic unauthorized financial changes occur.
- Exception history is preserved.

# 9. PHASE 5 — COD & FINANCIAL RECONCILIATION

**Priority: P1 — High**

## 9.1 COD Ledger

Maintain a financial record for every COD shipment.

Track:

- Expected COD.
- Updated COD.
- Collected COD.
- Provider-reported remittance.
- Bank-confirmed settlement.
- Outstanding amount.
- Reconciliation status.

## 9.2 COD Webhook

Process GHN COD events separately from ordinary delivery milestones.

Requirements:

- Verify and normalize events.
- Deduplicate notifications.
- Update financial records safely.
- Generate alerts for mismatches.
- Preserve adjustment history.

## 9.3 Financial Separation

Maintain separate concepts:

- Order total.
- Paid online amount.
- COD amount.
- Shipping cost.
- Merchant shipping subsidy.
- Actual provider charges.
- Refunds.
- Confirmed bank settlement.

Never treat delivery confirmation as proof of bank settlement.

## 9.4 COD Dashboard

Show:

- Expected COD.
- COD awaiting collection.
- COD collected.
- Provider-reported transferred COD.
- Bank-confirmed receipts.
- Reconciliation discrepancies.

Allow manual reconciliation with role-based approval and audit logs.

### Phase 5 Acceptance Criteria

- COD records reconcile with shipment history.
- Duplicate callbacks do not duplicate financial postings.
- Manual adjustments are traceable.
- Online-paid orders do not accidentally create COD debt.
- Financial metrics have documented definitions.

# 10. PHASE 6 — CUSTOMER SUPPORT & TICKET MANAGEMENT

**Priority: P2 — Medium**

Implement customer-facing shipping support and admin ticket management.

Customer actions:

- Report delivery issue.
- Request address correction.
- Report damaged packaging.
- Ask about delivery delays.
- Request redelivery assistance.
- Submit supporting photographs.

Admin actions:

- Review customer requests.
- Create GHN support ticket.
- Attach supported evidence.
- Submit ticket feedback.
- Retrieve ticket status.
- Manage ticket lifecycle.
- Record internal notes.

Use the GHN ticket APIs according to the verified multipart/form-data requirements and access permissions.

Never expose administrative ticket operations directly to customers.

Protect user-uploaded files with validation, authorization and reasonable storage limits.

### Phase 6 Acceptance Criteria

- Customers can submit shipping-related support requests.
- Admin can process requests using supported GHN APIs.
- Ticket history is persisted.
- Unauthorized users cannot access ticket attachments.
- Unsupported GHN ticket operations have safe fallback handling.

# 11. PHASE 7 — LOGISTICS ANALYTICS & AUTOMATION

**Priority: P2 — Medium**

Build a dedicated Admin Logistics Dashboard.

## 11.1 KPIs

Include:

- Total shipments.
- Successful deliveries.
- Failed deliveries.
- Return rate.
- On-time delivery rate.
- Average delivery duration.
- Average shipping cost.
- Shipping subsidy total.
- COD outstanding.
- COD reconciliation discrepancies.
- Orders requiring manual attention.
- Shipping performance by province.
- Shipping performance by warehouse.

Document the exact formula for every KPI.

## 11.2 Smart Shipping Cost Analyzer

Analyze:

- Shipping cost per order.
- Shipping cost per product category.
- Shipping cost by delivery region.
- Shipping subsidy by promotion.
- Quoted versus actual shipping fees.
- Unexpected fee increases.

## 11.3 Profit-Aware Shipping Promotions

Develop a configurable internal pricing rule engine.

Examples:

- Free shipping above a configurable order value.
- Partial shipping subsidy.
- Shipping discounts for selected products.
- Shipping incentives for loyalty members.

Always evaluate server-side:

- Order margin.
- Voucher discounts.
- Shipping subsidy.
- Maximum promotion limits.
- Business profitability constraints.

Do not silently modify existing promotional rules.

## 11.4 Operational Automation

Implement:

- Scheduled reconciliation for active shipments.
- Alert generation for overdue shipments.
- Shipping event notifications.
- Detection of duplicated or missing events.
- Manual intervention queues.
- Historical reporting.

Prefer existing job infrastructure when available.

If introducing queue technology such as Redis or BullMQ, justify the dependency and keep deployment compatible with the current environment.

### Phase 7 Acceptance Criteria

- Analytics are calculated from stored data.
- No fabricated metrics appear in production.
- Reports support filtering by time and status.
- Operational alerts are actionable.
- Expensive reporting queries are optimized.
- Financial metrics are independently testable.

# 12. PHASE 8 — MULTI-WAREHOUSE & MULTI-PROVIDER READINESS

**Priority: P3 — Future Expansion**

## 12.1 Multi-Warehouse

Support:

- Multiple GHN shops.
- Warehouse-to-ShopId mapping.
- Warehouse availability.
- Package origin selection.
- Shipping quote by origin.
- Inventory-aware warehouse selection.

Do not infer stock availability from GHN; use the existing inventory system.

## 12.2 Warehouse Optimization

Recommend fulfillment origins based on:

- Stock availability.
- Delivery eligibility.
- Shipping fee.
- Delivery estimate.
- Warehouse operating rules.

## 12.3 Multi-Provider Architecture

Prepare for future integrations:

- GHTK.
- Viettel Post.
- Other supported carriers.

Requirements:

- Shared normalized shipment model.
- Shared tracking interface.
- Provider capability registry.
- Provider-specific mappings.
- Clear configuration boundaries.

Do not implement unrequested external carrier APIs in this phase. Build only the extension architecture and tests.

## 12.4 Affiliate APIs

Document GHN affiliate capabilities for possible future seller onboarding.

Do not implement affiliate OTP workflows for ordinary customers.

### Phase 8 Acceptance Criteria

- GHN shop mapping supports multiple locations.
- Provider adapters can be added without rewriting checkout.
- Inventory and logistics responsibilities remain separated.
- Unsupported capabilities are explicitly handled.

# 13. DATABASE DESIGN

Inspect existing tables before proposing migrations.

Suggested entities, only where needed:

```text
shipping_providers
shipping_shops
shipping_address_mappings
shipping_quotes
shipments
shipment_events
shipment_exceptions
shipping_pickups
shipping_fee_adjustments
shipping_cod_ledger
shipping_tickets
shipping_webhook_inbox
shipping_audit_logs
```

Requirements:

- Preserve current order relationships.
- Use foreign keys where appropriate.
- Add unique constraints for provider shipment IDs.
- Enforce idempotency keys.
- Add indexes for tracking and operational queries.
- Use proper timestamp types.
- Define retention for raw webhook payloads.
- Protect personal information.
- Apply RLS where clients access Supabase directly.
- Prefer incremental, reversible migrations.

Do not create tables that duplicate an existing equivalent entity.

# 14. SECURITY & RELIABILITY

Mandatory requirements:

- Authentication and RBAC.
- Server-side ownership verification.
- Restricted admin mutations.
- Secure webhook ingestion.
- Input schema validation.
- Request rate limiting where appropriate.
- Sensitive-data redaction.
- Secret management.
- Idempotent shipment creation.
- Idempotent event processing.
- Safe retries.
- Timeout handling.
- Database consistency.
- Audit logging.
- Reconciliation jobs.
- Protection against duplicate COD postings.
- No privileged Supabase credentials in the frontend.
- No cross-customer data leakage.

For webhook ingestion, distinguish between provider-authenticated events and simply received HTTP requests.

Do not trust unauthenticated payloads to perform irreversible operations.

# 15. TESTING STRATEGY

Implement appropriate tests at each phase.

## Unit Tests

- Fee calculations.
- Address normalization.
- Provider mappers.
- Shipment state transitions.
- COD ledger logic.
- Idempotency behavior.
- Analytics formulas.

## Integration Tests

- GHN staging quote.
- Preview order.
- Shipment creation.
- Order lookup.
- Webhook processing.
- Status synchronization.
- Ticket operations where credentials permit.

## Security Tests

- Unauthorized shipment lookup.
- Cross-user tracking access.
- Forged webhook payload.
- Duplicate financial event.
- Invalid COD update.
- Missing GHN credentials.
- Invalid address identifiers.

## End-to-End Tests

- Checkout with shipping fee.
- Payment and fulfillment sequencing.
- Admin shipment management.
- Customer tracking.
- Delivery failure handling.
- Support ticket workflow.

Prefer mocked GHN integration for CI.

Live staging tests must be clearly separated and explicitly enabled.

# 16. PERFORMANCE OPTIMIZATION

Implement:

- Cache for GHN master data.
- Appropriate quote caching with expiration.
- Debounced address-dependent quote requests.
- Deduplication of simultaneous quote requests.
- Database query optimization.
- Background webhook processing.
- Pagination for large admin tables.
- Lazy loading for analytics.
- Bounded retries with backoff.
- Reconciliation only when necessary.
- Monitoring for GHN API failures.

Do not cache dynamic shipping fees indefinitely.

Do not introduce unnecessary calls on every page render.

# 17. REQUIRED DOCUMENTATION

Create or update:

```text
docs/shipping/
├── architecture.md
├── ghn-api-capabilities.md
├── setup.md
├── database-design.md
├── shipment-lifecycle.md
├── webhook-processing.md
├── cod-reconciliation.md
├── api-reference.md
├── testing.md
├── deployment.md
└── implementation-progress.md
```

Documents must describe actual implemented behavior, not aspirational behavior.

The progress file must track:

- Completed work.
- In-progress work.
- Remaining work.
- Blocking dependencies.
- Tests performed.
- Known risks.
- Next recommended task.

# 18. EXECUTION WORKFLOW FOR CODEX

Implement one phase at a time.

For every phase:

1. Inspect relevant existing code.
2. Verify needed GHN documentation.
3. Explain the planned file and database changes.
4. Implement the smallest safe increment.
5. Add or update tests.
6. Run relevant lint and type checks.
7. Run build when feasible.
8. Review changes for regressions.
9. Update documentation.
10. Report results.

After each phase, provide:

```text
PHASE REPORT

Phase:
Status:

Implemented:
- ...

Files created:
- ...

Files modified:
- ...

Database changes:
- ...

Tests executed:
- ...

Test results:
- ...

Security review:
- ...

External dependencies:
- ...

Known limitations:
- ...

Next phase:
- ...
```

Do not claim a test passed unless it was actually executed successfully.

Do not claim live GHN integration works unless the corresponding call was tested.

If a phase is blocked by credentials or external account permissions:

- Complete independent development and mock tests.
- Document the blocker.
- Do not invent success.
- Continue only with work that is safe and independent of that blocker.

Do not silently skip mandatory security or data consistency requirements.

# 19. DEFINITION OF DONE

The shipping system is complete when:

- Existing checkout remains functional.
- Shipping fees are calculated correctly.
- Eligible orders can create GHN shipments.
- Shipment creation is idempotent.
- GHN statuses are synchronized.
- Customers can track their own orders.
- Admin can manage supported shipment operations.
- Delivery exceptions can be handled.
- COD records can be reconciled.
- Support workflows are functional.
- Logistics analytics are available.
- Both storefront designs remain consistent.
- Sensitive information is protected.
- Critical tests pass.
- Documentation matches the code.
- Production configuration is explicit and safe.

# 20. FIRST TASK — START NOW

Begin with **Phase 0: Repository Audit & Technical Design**.

Your first actions:

1. Read the current Web_TramHuong repository.
2. Identify the actual backend and frontend structure.
3. Inspect order, checkout, payment, voucher, address and admin functionality.
4. Inspect Supabase schema and existing migrations.
5. Inspect authentication and role permissions.
6. Review GHN official API documentation.
7. Create `docs/shipping/ghn-api-capabilities.md`.
8. Create `docs/shipping/architecture.md`.
9. Create `docs/shipping/implementation-progress.md`.
10. Produce a detailed implementation strategy.

After Phase 0, proceed with Phase 1 in small, testable increments, provided it does not require destructive changes, real shipments or production credentials.

**FINAL INSTRUCTION:**

Build a secure, maintainable, customer-friendly logistics system that feels like an integrated part of a premium agarwood e-commerce platform.

Prioritize operational correctness, payment safety, customer trust and extensibility over flashy features.

Never sacrifice reliability for visual complexity.
