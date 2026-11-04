# P2-LIVE-03 — bounded consented localhost funnel

Design04/11/2026 before code. Reuse the eight existing Zen/Traditional tracker hooks, AnalyticsModule, ADMIN auth, consent state and LocalDebugEventService transport. No new module/table/migration/Google SDK. A dedicated default-OFF FEATURE_GA4_LOCAL_FUNNEL_ENABLED gates POST /analytics/local-debug-event/funnel. It additionally requires the previous local test gates, exact loopback Origin, development/test and dedicated stream G-XJNSBPN8HN. Production and staging remain blocked. This is an ADMIN localhost acceptance path, not anonymous customer production collection.

The ADMIN explicitly starts a RAM-only session after consent using the existing test panel. Subscribe to newly accepted tracker events only; never drain old mock buffers or replay denied events. Session lasts at most15minutes/20attempts, identity is ephemeral and stable only within that session. A bounded10event serial queue drops entries older than30seconds, never retries unknown outcomes, clears/aborts on revoke, expiry, stop, auth change or provider cleanup. Navigation within the root provider retains the session; reload closes it. General mock receipts remain labelled mock; separate session counters report transport accepted/unknown/dropped, never claim DebugView ingestion.

Server repeats allowlist validation independently: eight pre-purchase names only, VND, finite item subtotal, at most200items, stable product/variant IDs, prices and positive integer quantities, fixed list/shipping/payment enums. Reject unexpected fields including nested item names, URL, free text, coupon, order/payment/customer data and purchase/refund. SELECT_ITEM requires exactly one item. One bounded request per event to the existing fixed /mp/collect endpoint; debug_mode=true, session_id, engagement_time_msec and denied ads consent. Raw auth identity is never forwarded. Shared process ledger rejects changed duplicates (including event name/parameters), max100/day/30minute for funnel (manual retains20/day/5minute), one in-flight transport, no retries; process restart loses quota/dedupe, hence no production readiness claim.

Official contract rechecked04/11/2026: [GA4 event reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events), [Measurement Protocol sending](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events). MP normally supplements tag-generated identity; this QA session deliberately uses synthetic identity and does not establish website attribution/session accuracy. Value excludes shipping/tax and is item subtotal, not paid revenue. No financial hook/source change.

Acceptance: test gates/RBAC/strict privacy/schema/dedupe/budgets, session no-backfill/shared identity/revoke/cancellation/queue limits, both theme hooks and existing commerce regressions. Use fake Google transport first and label fixture visibly; no new real Google events during this implementation batch. The earlier local_test_action DebugView acceptance does not prove these eight event names ingested. Owner can separately opt into a bounded real session after reviewing offline acceptance. Rollback flagfalse/kill+restart+reload or stop session; no schema cleanup, no recall of already accepted Google events. No billing, DNS, real DB write, transaction, commit or push.


## Files changed in this batch

- API: new `src/analytics/local-funnel.contract.ts` and `local-funnel.service.spec.ts`; reuse/extend `local-debug-event.service.ts`, `local-debug-event.controller.ts` + existing HTTP spec and `collection-policy.service.ts`; `.env.example` adds one default-OFF subflag. No AnalyticsService/revenue/order/SePay/GHN changes in this batch.
- Web: new `src/lib/ga4/local-funnel.ts` and `components/analytics/LocalFunnelAuth.tsx`; extend existing tracker event subscription, contract selection cardinality, AnalyticsProvider, AnalyticsConsent, LocalGa4TestPanel, locale layout, pure logic test script and disposable analytics lab fixture. Existing eight business hooks reused without edits in this batch.
- QA/docs: existing `apps/api/scripts/demo-contact-protection.cjs`, this design, testing guide07, progress and p2-live-03-evidence.json. No package/module/schema duplication or dependency added.

## Actual acceptance05/11/2026

Full API46suites/576testsPASS (`/tmp/tramhuong-local-funnel-final-tests.json`). Afterwards added3budget/public-policy cases, targeted suite34PASS (`/tmp/tramhuong-local-funnel-extra-tests.json`):579distinct API tests passed across the two runs. Web55logic/privacy/session/schema-parity testsPASS (`/tmp/tramhuong-local-funnel-web-tests.txt`). APIbuild/scopedlint and webtsc/scopedlintPASS. Contact18HTTP and purchase26HTTP regressionsPASS, including6concurrent captures producing1purchase/1quota. No SQL change or production web build; disposable Next compiled actual routes without real-env prerender.

Initial sandbox HTTP test run hit EPERM; permitted localhost execution then passed. Browser initially exposed a native fetch receiver error not reproduced by Node's fetch. Fixed by calling the stored transport as an unbound function, added regression test, restarted fixture and repeated browser acceptance successfully. Lint findings in test fixtures corrected. No blanket claim that all baseline repository lint errors are fixed.

Browser current run:22fake HTTP204 requests,12Traditional+10Zen; all8event names observed in fixture transport; zero Google calls. Earlier isolated curl diagnostic made1additional fake request in the prior fixture process. Real Traditional PDP add/cart and checkout recipient→payment-step tested with synthetic address; stopped before order placement. Both themes PDP/select/add and checkout entry verified. Shipping/payment enums additionally exercised via explicit lab controls; no SePay confirmation/purchase dispatch was invoked. Zen displays USD visually but payload remains VND. Consent revoke stopped session, cleared mock buffer and disabled start; adding to cart still worked while denied. Regrant did not auto-start. Same-locale navigation retained RAM session; locale change started inactive. Zen375px scrollWidth375, viewport restored. Final session explicitly stopped, screenshot `/private/tmp/ga4-local-funnel-test.png`. These are fixture acceptance results, not Google ingestion evidence.

## How to run

From `apps/api`, stop any earlier lab sharing ports4400/4401. Offline UI acceptance:

```sh
node scripts/demo-contact-protection.cjs --analytics --ga4-funnel-fixture
```

Open localhost4400 `/vi/integration-lab/analytics` or `/en/`. Read privacy text, grant consent, explicitly start the funnel session, then perform new product/cart/checkout actions. Fake transport is visibly labelled. Old buffer entries are never drained. Revoke consent or stop the session. This command does not read real credentials or call Google.

For a separately reviewed real test only, the prepared opt-in command is:

```sh
node scripts/demo-contact-protection.cjs --analytics --ga4-funnel-live-test
```

NOT_RUN in this batch. It reuses only the owner's locally configured GA4 ID/secret, never prints them, requires the dedicated stream and honors the persistent kill switch. Maximum20actual Google attempts/process (the older manual-only --ga4-live-test remains capped1); mixed live+fixture options reject before credential read. Session remains inactive until ADMIN test control and consent are both granted. This creates real non-purchase test events, so do not casually restart/resend after unknown results. Verify the eight names independently in owner DebugView before any broader activation. The dedicated test path does not certify real visitor attribution or a durable production pipeline.

Normal backend configuration requires all three default-OFF flags FEATURE_GA4_ENABLED, FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED and FEATURE_GA4_LOCAL_FUNNEL_ENABLED plus the existing local-origin/runtime/stream gates; no real .env was changed. Product ADMIN auth remains real; synthetic fixture token works only in disposable QA auth overrides. Rollback the funnel flagfalse plus restart/reload or stop lab/session; old mock paths keep operating. No DB cleanup.


## P2-LIVE-03b — owner-authorized real transport acceptance05/11/2026

Owner asked “oke hãy chạy thử” and confirmed they would check DebugView. Ran the prepared `--analytics --ga4-funnel-live-test` once, using only the existing dedicated test-stream credentials. No real .env modification or persistent flag activation. The disposable database/auth/catalog stayed synthetic, while Measurement Protocol transport was real.

Explicitly started the consented ADMIN session in the existing EN/Zen lab. Initial mock view_item_list was not replayed. UI actions add/cart + lab shipping/payment enums + product selection/PDP view + return-to-list + checkout entry + return-to-list + remove produced9actual Google HTTP204 requests, covering8names. First response05/11 00:11:52.440 and last00:13:14.671 Asia/Ho_Chi_Minh. Counts: add_to_cart1, add_shipping_info1, add_payment_info1, select_item1, view_item1, view_item_list2, begin_checkout1, remove_from_cart1. Two list views correspond to two distinct returns, not a transport retry. No purchase/refund; fake-purchase button rejected before transport. No form submission/order placement/SePay/GHN/SMTP call.

Browser counter9attempted/9HTTPaccepted/0unknown/0dropped. Stopped session explicitly, captured `/private/tmp/ga4-live-funnel-accepted.png`, then stopped the owned live QA process and verified ports4400/4401 have no listeners. Re-running a lab now requires an explicit operator command. Real provider endpoint acceptance VERIFIED. Owner subsequently confirmed all eight event names visible in DebugView on05/11/2026 (OWNER_REPORTED_ALL_8_NAMES); this is explicit owner text evidence, not an inference from204 or an independent Google UI inspection by the agent. Earlier local_test_action screenshot remains separate evidence only.

Changed only QA script safe logs to include allowlisted eventName and response timestamp, plus this document, progress and p2-live-03b-evidence.json. Node syntax/evidence assertions/diff whitespace checked; real UI provided the transport acceptance test. No collection/business code change, dependency, schema, billing, DNS, hosted write or real transaction; full regression not repeated for logging/evidence-only change. No commit/push. Next: record owner's DebugView screenshot/names and parameter checks, retaining standard-report/attribution/durable quota/financial gates as open.


### Owner acceptance05/11/2026

Owner explicitly reported seeing view_item_list, select_item, view_item, add_to_cart, remove_from_cart, begin_checkout, add_shipping_info and add_payment_info. All8expected names match the real-run transport log. DebugView event-name ingestion is OWNER_REPORTED_VERIFIED. No screenshot was supplied in this follow-up; per-event counts and parameter values were not confirmed. Standard reports, currency/value/items as ingested by Google, attribution, purchase/revenue reconciliation and production collection remain unverified. No extra provider request, code/env change or transaction was needed to record this acceptance. Evidence JSON and documentation consistency checked; code tests not repeated for documentation-only update. Next acceptance step: inspect VND/value/item_id/price/quantity for representative events before expanding collection; keep financial purchase separate.


### Partial parameter evidence — owner screenshot05/11/2026 00:22:56

DebugView add_to_cart at00:11:52 visibly shows currencyVND/value100000, engagement_time_msec1 and ga_session_id1793812311. Currency/value match the actual real-run action: one added unit at100000VND, even though the cart already contained other fixture units. add_to_cart measures the added delta, not the entire cart subtotal. This screenshot does not show items/item-level price/quantity, so those remain unverified. Two separate one-unit additions can legitimately produce two100000events; a single two-unit addition would be expected to have value200000. That specific two-unit real test has not run. No further Google requests or live activation; mock lab remains the last reopened environment. Updated evidence/progress only; JSON assertions and diff checkPASS.


## P2-LIVE-03c — DebugView device selection investigation05/11/2026

Owner reported new add-to-cart actions absent from DebugView. Read existing live QA logs, no additional agent-generated reporting events and no server restart: eight initial owner requests27:42–30:25 receivedHTTP204; owner continued to17observed total by00:39:44, still within20attempt process cap. Native Brave inspection of actual property562307226 initially showed nine old events at00:11–00:13. After refreshing and opening the device selector, observed3devices all labelledweb. Selecting another device showed owner select/view/add/list at00:27–00:28; selecting the other showed add_to_cart3/remove_from_cart1 including twoadds00:30:25–00:30:26. Screenshot `/private/tmp/ga4-debugview-current-device.png`. This independently verifies those owner event names/times/counts were ingested. No send-path failure established; the selected DebugView device was the old session. Per-start ephemeral client identity deliberately creates separate sessions/devices, and all share the genericweb label. Do not persist identity or disable privacy controls just to simplify QA.

Owner interacted with Brave during investigation; avoid competing clicks. Kept server running for owner, did not resend/restart to bypass caps. Later owner actions through00:39 were transport-observed only, not all independently inspected in Google. No item-level/200000parameter acceptance claimed. No business code/env/schema/billing/DB/financial action changed; docs/evidence only. Next: keep one test session active, select its DebugView device, inspect the representative add-to-cart parameters.

### DebugView shows only old events

In property Web_TramHuong - Test, open the top-left **Thiết bị gỡ lỗi** selector. Multiple entries can all be named **web**. Choose the one whose event timestamps match the current lab session; refresh DebugView if device options have not populated. Keep the same lab session/tab while testing instead of repeatedly stopping/starting/reloading it. A fresh lab session has a new ephemeral client identifier and can appear as another DebugView device. This is separate from HTTP acceptance. Official device-selector guidance: https://support.google.com/analytics/answer/7201382?hl=vi . No billing/permission or tracking configuration change is needed for this UI selection.
