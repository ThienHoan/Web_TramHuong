# P2-LIVE-02 — consent-aware local browser test

Design04/11/2026 before code. Owner authorized continuing from validated debug payload to a real DebugView test in dedicated streamG-XJNSBPN8HN. Scope is one manual nonfinancial local_test_action, not automatic ecommerce/purchase ingestion. Existing mock funnel/purchase services and business workflows unchanged. No Google tag/script is loaded; existing consent tracker gates browser request; server Measurement Protocol sends debug_mode=true to /mp/collect. This event can appear in test-property reports; it is not /debug validation.

Reuse AnalyticsModule/AuthGuard/RolesGuard/CollectionPolicy/consent tracker. POST/analytics/local-debug-event ADMIN-only, exact approved loopbackOrigin, development/test+FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED defaultfalse+existingGA4flag/kill. Strict body consent=granted, eventIdUUIDv4, action=manual_test, ephemeral numeric clientID/sessionID only. No URL/title/user/product/money/order fields accepted or forwarded. Public policy advertises optional localDebug only when configured; no secret client side. Does not prove a valid api_secret until actual Google acceptance/reporting is observed.

One process-local in-flight request, max20events/day/5minute, one attempt/no retry; bounded10s; unique event ID stored before send. Return accepted for HTTP2xx, never delivered/ingested; timeout outcomeunknown and repeated eventID never resent in process. This is manual local QA, not durable dedupe/distributed quota for production. Restart clears this test ledger. Consent revoked/expired/storagefailure/DNT/GPC blocks new browser calls; cancellation cannot recall an already accepted event.

Default .env unchanged; isolated lab opt-in reads onlyGA4ID/secret into localfixture service, not realDB/AppModule/cron. Existing demo synthetic auth is accepted only in QA auth override; product endpoint uses real authguard. Featureflagfalse/kill+restart rolls back immediately. No schema/dependency or financial event, billing/DNS change.

Acceptance must distinguish browser accepted response from observed DebugView. Owner has authenticated Analytics session in their own browser; do not claim Google UI observation without evidence. Full realfunnel/GA4purchase consent/privacy/sessionattribution/durableoutbox gates remain open.


## Actual acceptance04/11/2026

- API45suites/534testsPASS including26newcases (15service/11HTTP); web46logic testsPASS including3new local consent/transport checks. APIbuild/scopedlint and webtsc/scopedlintPASS. Fullresult/tmp/tramhuong-local-ga4-tests.json. Existing shipping/SePay/orders/vouchers/mail/auth retained.
- Browser fixture first: existing preferencegrant -> explicitlyopenpreferences/revoke (buttondisabled), reopen/readupdatedGooglecopy/grant (buttonenabled), clicktest ->fakeHTTP204/buttondisabled. ZeroGooglecalls. QA policy marks fixture transport, so UI says fake transport/noGoogle rather than asserting provider acceptance. Actual mode separately restarted after offline tests.
- Browser real: actualstreamG-XJNSBPN8HN, consentgranted, oneclick ->backendlog sourcegoogle/httpStatus204/requests1; UIaccepted/buttondisabled. No second /mp/collect, purchase, rawURLs/titles/user/product/orderdata. IngestionVerifiedfalse; owner must inspect their authenticated DebugView. Screenshot/private/tmp/ga4-local-reporting-test.png, VI lableftopen. No GoogleUIlogin/read/DebugView observation by agent.
- Shared demo contact18HTTP and purchase26HTTPchecksPASS afterwards, no extra GA4request. No new frontend productionbuild (existingrealenv/prerender), isolatedNext routecompiled. SQLunchanged notrerun. No new dependencies, billing/DNS/hostedDBwrite or commit/push.

## Files and rollout

APInew analytics/local-debug-event.service.ts/controller.ts and2specs; existingAnalyticsModule registers factory/controller. CollectionPolicyService optional publiclocalDebug metadata (onlywhenconfigured; missingfield=oldmockbehaviour). API.env.example adds defaultOFF flag+loopbackorigin, real.env unchanged.

Webnew lib/ga4/local-debug.ts and components/analytics/LocalGa4TestPanel.tsx; AnalyticsProvider optionalcontext; AnalyticsConsent truthfulcopyconditional; admin/dashboard mounts panel with realAuthsessiontoken; disposablelab mounts with syntheticadminfixturetokenonly. scripts/test-analytics.cjs extends existingpurelogic suite. No automatic event hooks/GooglebrowserSDK or cookies added. Existing8ecommerce events stay mock; this feature only sends manualcustomtest.

Demoexisting scripts/demo-contact-protection.cjs options --analytics --ga4-local-test-fixture (injected204, no credentials), or --analytics --ga4-live-test (reads2GA4secretvalues only andexpectedstream, killhonored, bindsloopback, MAX1actualGoogleattempt/run). Explicit opt-in flags required; no envflag persisted. Node.env AppModule/cron/actualAuth/DB not loaded inlab. No other provider credentials forwarded. Productimplementation requiresADMINrole and exactOrigin; synthetictoken only works in QAauthoverride.

Runtime productgates: FEATURE_GA4_LOCAL_BROWSER_TEST_ENABLED=true, FEATURE_GA4_ENABLED=true, INTEGRATIONS_ENV=mock, NODE_ENV development/test, killfalse, GA4_LOCAL_TEST_ORIGIN exactloopbackorigin, expectedteststream/secret. Although registryenv ismock to keep existing consenttracker available, this separate opt-in endpoint returns sourcegoogle_measurement_protocol and actually sends onecustomdebug-mode reportingevent. Never infer allmockpaths suddenlylive. Production/staging registryblocked, production NODE_ENVblocked. Flags remain false in example/default/mainenv; manualdemo alone is active.

## Owner check

Owner supplied a DebugView screenshot captured04/11/2026 23:46:32 Asia/Ho_Chi_Minh. The URL identifies property562307226 and the header shows Web_TramHuong - Test. DebugView displays local_test_action at23:38:59 and a total of1 occurrence in the last30minutes. Visible parameter names include engagement_time_msec, ga_session_id and test_action. This verifies ingestion of the single manual test event in the dedicated test property, beyond the earlier HTTP204 acceptance. Evidence is owner-provided imagery, not an agent login to Google. No additional provider request was made for this verification. The API's ingestionVerifiedfalse response remains correct: the request handler cannot itself inspect Google DebugView. Standard report processing, automatic ecommerce, purchase and production analytics remain unverified.

In Google Analytics choose Web_TramHuong - Test/property562307226, then Admin -> Data display/Hiển thị dữ liệu -> DebugView. Look for local_test_action on the debug device; select device if offered. HTTP204 proves transport acceptance only, not ingestion orAPIsecret validity. If event absent, inspect correctproperty/device/privacyfilters and credential before another operator-authorized test; do not keep generating duplicates. The Test event uses an ephemeral numericclientID/sessionID, not a realshopperID.

## Limits and rollback

This is not automatic view/cart collection, gtag consent mode implementation, durable delivery or productionanalytics. Browser preference is reused but the manualbutton clearlystates it sends toGoogle; no sending automatically from an oldstoredgrant. Cancellation/revocation blocksnewrequests and ignoresresult; cannotunsendalreadyacceptedGoogleevent. Featureflagfalse/kill+restart or stopownQAprocess rolls back; metrics alreadyaccepted byGoogle cannotbe recalled by localflag. No DBcleanup needed. FullGA4financialfunnel/retention/attribution and Phase2 remainopen.
