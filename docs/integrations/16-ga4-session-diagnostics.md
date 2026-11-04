# P2-LIVE-03d — explain stopped local GA4 sessions

Design05/11/2026 before edits. Owner reports the funnel turns itself off after adding to cart. Existing live QA process86013 logs confirm20actual Google requests exhausted at00:46:32 local (last add_to_cart HTTP204); subsequent transport guard exceptions were collapsed into unknown, and the browser silently stopped. The server budget is per process, not reset by the browser session button. Preserve all limits/no retries/default-OFF/consent gates; no automatic budget reset or additional Google calls.

Reuse LocalDebugEventService and LocalFunnelSession. A typed pre-transport test-limit error carries only a fixed safe reason through the local response and dedupe ledger. Return blocked/test_limit only when that local guard establishes zero outbound attempt; provider/network uncertainty stays unknown. Browser snapshot records stop reason and ephemeral numeric sessionId (RAM only) for DebugView ga_session_id comparison, not client ID/token. Explain manual stop, consent, expiry, auth, disabled policy, frontend session cap, server test cap, quota/busy, rejection and network/unknown outcomes. Known exhausted server cap prevents repeated starts in the same page; reload is not presented as a budget-reset remedy. Existing queue/abort/expiry/dedupe/privacy behavior remains intact.

Verify with fake transports: backend blocked-vs-unknown/idempotent reason; frontend stop causes/no retry/no false accepted/empty queue/session identity; real UI cap response and VI/EN clarity. Add disposable --ga4-funnel-limit-fixture option (fake transport capped20) so the actual demo exhaustion path is testable without secrets or provider calls. Do not start a new real budget automatically. No commerce/financial module, table, migration or dependency added. Rollback existing local funnel flagfalse/restart/reload or stop lab. Prior two-unit200000Google acceptance remains pending.


## Actual result05/11/2026

Prior real process had20HTTP204 requests; last00:46:32.520local. No extra real Google request during this fix. Stopped exhausted real process and used --analytics --ga4-funnel-limit-fixture for acceptance. Loopback verifier first requires sourcefixture/googleRequests0, then20fakeacceptances, nextintent blocked/test_limit and identicalduplicate blocked/test_limit/duplicate. UIstart+add after that quota shows inactive/1attempt/0accepted/0unknown/1blocked, disabledstart, numeric sessionID and explicit Vietnamese server-run-limit message. Cart still added1item. Screenshot `/private/tmp/ga4-session-limit-message.png`. No quota reset or retry is performed by browser start/reload.

Full API46suites/581testsPASS, web59logic/session/schema/privacytestsPASS, APIbuild/scopedlint/webtsc/scopedlintPASS. Contact18HTTP/purchase26HTTP regressionsPASS withfakeDB only. Two new backendcases distinguish trustedtypedcap from arbitrary providererror text, retainreasononduplicate; fournewwebcases cover servercap/no rearm,6HTTPcauses, identityRAM/forwarding/stopretention and5stopreasons. Productionwebbuild skipped (inheritedenv/prerender); disposableNext compiled actualroute. UnchangedSQL not rerun. Node script syntax/evidence assertions/diff checkPASS.

## File manifest

- API existing `src/analytics/local-debug-event.service.ts`: typed local guard error + safe blocked reason in dedupe/result. Existing `local-funnel.service.spec.ts`: cap/redaction/nontrustederror tests.
- Web existing `src/lib/ga4/local-funnel.ts`: stop reason/session ID/blocked counter and HTTP cause handling; existing `components/analytics/LocalGa4TestPanel.tsx`: VI/EN explanations, disabled rearm and session-ID comparison. Existing `scripts/test-analytics.cjs`: four additional meaningful behavior tests.
- QA existing `apps/api/scripts/demo-contact-protection.cjs`: fake capped flag, trustedcaperror; new `apps/api/scripts/verify-ga4-test-limit.cjs`: fixture-only20+blocked/duplicate verifier. No new module/table/package/dependency.
- Docs thisdesign, guide07, progress +p2-live-03d-evidence.json. Real.env, checkout/orders/SePay/GHN/voucher/SMTP/revenue modules untouched thisbatch.

## Operation and rollback

Run capped offline fixture from apps/api with `node scripts/demo-contact-protection.cjs --analytics --ga4-funnel-limit-fixture`; on a fresh process run `node scripts/verify-ga4-test-limit.cjs`, then start the browser session and add an item to observe the exhausted-budget message. This is fake transport and does not prove Google ingestion. Restarting only the browser does not add server-run attempts. Final lab left running in exhausted capped fixture mode so owner can inspect the explanation. No further real budget activated.

Stop reasons are local diagnostics, not proof that provider/network failures never ingested events. Only trusted pre-transportcap is marked blocked/test_limit; unknown remains uncertain and never retried. The displayed sessionID is an ephemeral number in RAM only, preserved for review on stop; no token/clientID is exposed or persisted. Rollback existing localfunnelflagfalse+restart/reload/stoplab; no schema/data cleanup. Live cap20 is unchanged. Two-unitGoogleamount/items acceptance still pending; no financialpurchase sent.
