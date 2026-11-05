# P1-03b — Cloudflare Turnstile live verification (test keys first)

Design before code 05/11/2026. Reuses the P1-03 contact protection: existing
`ContactsController` routes, `ContactProtectionService`, the authored
`SiteverifyTurnstileAdapter`, frontend `useContactProtection` + `ContactProtection`.
No new route, table, migration or dependency.

## Official contract (read 05/11/2026)

- Testing page (updated 20/10/2026): dummy sitekeys `1x00000000000000000000AA`
  (pass, visible), `2x00000000000000000000AB` (fail), `3x00000000000000000000FF`
  (interactive); dummy secrets `1x…AA` pass, `2x…AA` fail, `3x…AA` "already spent".
  Test keys work on localhost; the dummy token is `XXXX.DUMMY.TOKEN.XXXX`; test
  secrets accept only the dummy token and real secrets reject it. Sample success
  response: `action: "test"`, `hostname: "localhost"`, old `challenge_ts`.
- Server validation (updated 22/10/2026): `POST …/turnstile/v0/siteverify`, form or
  JSON, `secret` + `response` (+ optional `remoteip`, `idempotency_key`); token ≤2048
  chars, valid 300 s, single-use (`timeout-or-duplicate`); validate action and
  hostname; backend is the sole caller; reasonable timeouts.
- Client rendering: `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`,
  `turnstile.render/reset/remove`, `callback`, `error-callback`, `expired-callback`,
  `timeout-callback`, `action` ≤32 chars `[A-Za-z0-9_-]`.

## Behaviour

New mode `cloudflare` beside `disabled | mock | unavailable`. It is real outbound
work, so it never runs under `INTEGRATIONS_ENV=mock`. Gate (all required):
`FEATURE_TURNSTILE_ENABLED=true`, kill switch off, `INTEGRATIONS_ENV=staging`,
`NODE_ENV` development/test (production stays `unavailable` until a release gate),
`TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` present and of the same kind (both
documented test keys, or both real). Real keys additionally need
`TURNSTILE_ALLOWED_HOSTNAMES` (comma list). Misconfiguration → `unavailable`
(fail closed: contact form cannot be submitted), never mock fallback.

- `GET /contacts/protection` → `{mode:'cloudflare', siteKey, testKeys}`; the site
  key is public by Cloudflare design; the secret never leaves the backend.
- `POST /contacts/protection/challenge` stays mock-only (503 in cloudflare mode).
- `POST /contacts`: token required (≤2048), one siteverify call via the existing
  adapter (8 s deadline, 16 KB body cap, `redirect: error`, no retry: tokens are
  single-use). `success:false` → 403 with the existing safe message; transport/
  shape errors → 503; nothing saved in either case. Real keys: hostname must be
  allowlisted, `action === 'contact'`, `challenge_ts` within 300 s (+30 s skew).
  Test keys: Cloudflare returns fixed `action`/`hostname`/old timestamp, so only
  `success` is enforced and the UI says "khóa thử — chưa chống bot thật".
- Process bounds: ≤4 in flight, 60/min, 2000/day (route throttle 5/15 min/IP
  already applies). Logs carry outcome and Cloudflare error codes only — never the
  token, secret or e-mail.

Frontend: status `cloudflare` loads the explicit-render script once, renders the
widget with `action:'contact'`, stores the token from `callback`, clears it on
expired/error/timeout, resets the widget after every submit (token is consumed),
removes it on unmount. Script failure → existing "unavailable + reload" state.
Mock and disabled paths unchanged.

## Verification

Offline: service gate matrix and verify rules with a fake transport; contact HTTP
with real DI + fake transport; web contract tests; QA lab with a fake
`window.turnstile` (no Cloudflare script). Then, only with owner approval: one
real siteverify with the documented test secret, and one browser load of the
Cloudflare widget with the test sitekey on localhost. Real keys/domain later.

## Acceptance — local, 05/11/2026 (no approved real call yet)

- Backend: `contact-protection.service.ts` (cloudflare mode, `turnstileLiveConfig`,
  live budget, safe logging), `integrations.module.ts` (`TURNSTILE_TRANSPORT` DI
  token, adapter only with a valid key pair). Frontend: `useContactProtection.ts`
  (`cloudflare` status, `acceptToken`/`clearToken`/`bindWidgetReset`),
  `ContactProtection.tsx` (explicit-render loader, widget lifecycle, test-key
  label, load-failure retry). QA: `scripts/fixtures/turnstile-lab.tsx`, demo flag
  `--turnstile-cloudflare-fixture`, `/api/__qa/turnstile`. `.env.example` keys.
- Tests: `contact-protection.live.spec.ts` 36 cases (config reasons, gate matrix,
  test-key acceptance of Cloudflare's fixed action/hostname/old timestamp, real-key
  action/hostname/freshness rejections, malformed token never sent, single call/no
  retry, 60/min and 4-in-flight bounds, mock challenge closed, logs without token/
  secret, real DI HTTP: one POST with only `secret`+`response`, `redirect:error`,
  403 + nothing saved for forged/missing token, Jest network guard). Existing
  Turnstile 29 PASS. Full API 67 suites/995 PASS, build, scoped lint, web tsc/lint.
- Browser (QA lab 4410/4411, fake `window.turnstile`, backend in real cloudflare
  mode with fake siteverify): widget rendered once with action/callbacks; submit
  locked until token; submit → siteverify 1 call accepted → 1 saved; widget reset,
  form cleared, submit locked; expire → expired message; VI 1280 and EN 375 no
  overflow; every request to localhost/127.0.0.1, zero to Cloudflare.
- Not rerun: `scripts/verify-contact-http.cjs` (mock lab on 4400/4401); the
  command that restarts that lab was refused by the session safety check.

### Incident: unapproved Cloudflare test-key calls during test development

While the HTTP spec was first written, an earlier `describe` called
`jest.restoreAllMocks()`, which removed the global `fetch` spy before the HTTP
block compiled the module. The app under test then used real `fetch`: two runs
sent about 4 POSTs to the real siteverify endpoint with Cloudflare's **public test
secret** and the dummy/"forged" token (no owner key, no customer data, no cost).
Both 201 results imply the always-pass test secret accepted even "forged".
Fixes: transport injected via `TURNSTILE_TRANSPORT`, per-block spy restore, and a
global Jest setup (`test/no-external-fetch.cjs`) that rejects any non-loopback
fetch in every API test; a test asserts the guard. Reported to the owner.

### Approved real call — 05/11/2026

Owner approved "Cho phép 2 request". `check-turnstile-live.cjs
--allow-cloudflare-test-call` (test keys hard-coded, `.env` not read) through the
real `ContactProtectionService` + `SiteverifyTurnstileAdapter` + real `fetch`:

| Case | HTTP | success | hostname | action | error-codes | Service | Latency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| always-pass `1x…AA` + dummy token | 200 | true | `example.com` | absent | `[]` | accepted | 1 242 ms |
| always-fail `2x…AA` + dummy token | 200 | false | absent | absent | `invalid-input-response` | 403 | 42 ms |

Finding: the live test-key response differs from the documentation sample
(`localhost` / `"test"`): hostname is `example.com` and `action` is absent. The
test-key rule (enforce `success` only) is therefore required; real keys still
enforce action/hostname/freshness and need their own acceptance on the domain.

### Still pending (prepared, not run)

1. Done above (2 POSTs, PASS).
2. Optional browser check of the real Cloudflare widget script on localhost with
   the test sitekey (loads `challenges.cloudflare.com` in the browser).
Real keys/domain, privacy-policy mention of Cloudflare and production gate remain.

Note: the owner's earlier plan (`31-localhost-turnstile-gemini.md`) allowed at most
1 Siteverify POST; the owner then approved 2 explicitly in chat ("Cho phép 2
request"), which is what ran. Its other items are met: verification before
persistence, only token + test secret sent, production checks not relaxed (test
keys get their own rule), RAM fixture lab on separate ports.
