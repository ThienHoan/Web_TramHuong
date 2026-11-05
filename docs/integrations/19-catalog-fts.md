# P5-02 — catalog PostgreSQL full-text baseline

Design recorded before code05/11/2026. Continue from P5-01a; no new provider,
model, embedding, auth session or catalog table. Existing ProductsService,
ChatModule/advisor, Supabase service-role client and commerce price calculator
remain the boundaries. Actual schema metadata reviewed in04; original product
and translation rows remain authoritative.

## Migration batch P5-02a

Add immutable Vietnamese/English accent-normalization/document helpers, a GIN
expression index on existing product_translations and one service-role-only
catalog_search RPC. Explicit `simple` text configuration, title weightA/bodyB,
conjunctive plain query terms with a small documented query stopword list;
no SQL/query-language interpolation, external extensions or dynamic SQL.
Normalize UnicodeNFD, remove Vietnamese combining marks and map đ→d; keep
English words without stemming. Index title first300chars/body first10000chars
to bound pathological documents; not a semantic/synonym engine.

Search across matching translations before limiting20results, join current
active/in-stock products, filter requested locale/category/effective VND budget
and unsupported variants before limiting, rank deterministically by score/ID.
Use the same positive-price discount/date semantics as commerce. Return only
approved public catalog fields and ranking, never private product/user fields.
RPC invoker security with fixed search_path; revoke PUBLIC/anon/authenticated
execution. Pure string/document helpers have explicit execute grants to existing
source-writing roles so expression index maintenance does not break catalog
writes. They have no table access/side effects. No permissive table/RLS changes.

Migration is a transactional first-install package for manual TEST DB review.
No remote apply, env change, cron or triggers. Index build can take a write lock;
measure hosted size/build duration before operator applies. Pause revokes only
RPC execution, preserving source rows/index. Repeat installer must refuse and
preserve data. Metadata checker is SELECT-only. Verify exact SQL in PGlite with
roles, filters, current updates, index eligibility, query benchmarks, rollback
and pause. Local latency/query-plan data is fixture evidence, not hosted load
or a reason to activate pgvector automatically.

## Application batch P5-02b

Add a typed CatalogSearchRepository in existing ProductsModule. New internal
subflag CATALOG_FTS_ENABLED defaultsfalse; only dev/test + registryenvironment
mock + kill switchfalse can call RPC in this release. Production/staging
activation remains blocked. The flag is independent of Gemini/pgvector flags;
keyword search must not activate a model or vector integration.

Validate config at startup, strict RPC result scope/length/fields and fixed
timeout without retry. Missing RPC, permission/pause, timeout or malformed
response → existing bounded keyword fallback and explicit searchFallbackReason.
An empty valid FTS result stays empty; never substitute unrelated products.
Expose truthful searchEngine/catalogScope/candidateLimit in existing advisor
response. Re-run the same source after mock selection to rebuild current fields
and discard unpublished/out-of-stock/budget-changed products. Defaults preserve
the current keyword behavior. No change to legacy ChatService/browser search
routes in this batch.

Actual result/check counts, deployment/rollback instructions and benchmark
limitations are appended after execution. FTS usefulness on owner catalog and
live model/notification/other-provider work remain separate gates.

Official references checked05/11/2026:
- https://www.postgresql.org/docs/17/textsearch-tables.html
- https://www.postgresql.org/docs/17/textsearch-controls.html
- https://supabase.com/docs/guides/database/full-text-search

## Follow-on P5-01b — connect existing chat to grounded advisor

Design before code: both current `/chat/message` and `/chat/stream` call an
unmanaged legacy SDK model. Replace that implementation inside existing
ChatService with delegation to the validated advisor; keep routes/SSE event
types, raw_response/JSON recommendation block and existing recommendation cards.
Default behavior becomes explicit catalog assistance, not generative Q&A.
Gemini mock flag/kill policy applies to ID selection; no live model/key read or
SDK initialization. Model free text/history never becomes an authoritative
price, stock, origin or health claim. Legacy SDK dependency remains installed
but unused; no live transport is certified by this change.

Read-only chat responses use current source IDs/titles/prices and safe fixed
copy; empty/unavailable catalog asks for a product name or retry. Ignore history
for selection and do not echo PII. Bounded120char lexical query; deterministic
VI/EN maximum-budget phrases (e.g. dưới500k/under500000) become structured
maxPrice; no semantic/medical claims. Preserve compatibility by returning
response/raw_response/text plus recommendations and truthful source metadata.
Single content SSE chunk + done is sufficient for the existing fetch consumer;
this is not a Gemini token stream. Optional locale defaultsvi; widget passes
existing locale without visual/layout changes.

Test JSON/SSE parity, no-match/DB failure, budget conversion, no history/model
PII path, escaping product text/JSON fences, local mock/kill/staging policies,
and full existing module HTTP wiring. Source/backend and browser SSE contract
tests must pass; no real model or hosted DB request is part of acceptance.

## Executed acceptance — 05/11/2026

- Exact SQL + metadata checker/pause/partial-install rollback: **58checksPASS**
  in PGlite. Includes real TypeScript CatalogSearchRepository→advisor against
  the exact in-memory RPC. The transport maps bound arguments to SQL; it does
  not return a fabricated search array. No .env or remote client used.
- 12synthetic VI/EN queries matched their declared expectations;9nonempty cases
  have top5recall1,3intentional empty cases have recallnot-applicable. Target
  products lie beyond150filler products, so success does not rely on the old
  first100window. Rank title before body, match decomposed/accentless Vietnamese,
  filter active/stock/category/effective budget before20resultlimit, reject
  unauthorized RPC roles and preserve source/index writes. English plural
  stemming/synonyms are explicitly not provided by simple configuration.
- GIN index eligibility checked with EXPLAIN/enable_seqscanoff. This proves an
  index path is available, not that a hosted planner will choose it for every
  catalog size/query. Per-query3local timing samples in
  `p5-02-evidence.json` are diagnostic only, not production latency/SLA.
- FullAPI **55suites/757testsPASS**. Focused
  `pnpm --dir apps/api run test:catalog-search` **5suites/106tests +58SQLchecksPASS**.
  Updated `test:connections`: **10suites/178testsPASS**.
  Coverage includes config/defaultoff/kill/staging/prod blockers,3second hung
  query abort/no retry, strict RPC projection, valid-empty handling, revalidation,
  JSON/SSE compatibility and maximum-budget interpretation.
- Web `test:chat` **4testsPASS**, including real client UTF-8/SSE boundary handling,
  cancellation signal and locale; existing health/OAuth26+analytics59PASS.
  APIbuild/scopedlint +webtsc/scopedlintPASS. No production web prerender.
- Real existing ChatWidget on disposable lab: two SSErequests, VI/EN product
  recommendations rendered,1440/375nooverflow,0JSerrors/0externalrequests/
  0hostedwrites/0realmodelcalls. Screenshots `/private/tmp/tramhuong-chat-vi.png`,
  `-en.png` and corresponding `-mobile.png` viewed; UI report
  `/private/tmp/tramhuong-chat-ui-report.json`. Layout/cards were reused.

Minor fixture/lint corrections were made before final passes: explicit empty
NODE_ENV needed to test blocked mode because Jest sets process.env.NODE_ENV=test;
unneeded assertions/unused test parameter/regex escape fixed. Sandbox loopback
denial is not a product regression; HTTP tests reran with approved local listen.
No source behavior was weakened to make an invalid case pass.

## Install TEST DB package and verify

Agent did **not** apply SQL remotely. Operator procedure after schema/restore
point review on the previously confirmed TEST project:

1. Keep CATALOG_FTS_ENABLED=false. Review existing products/product_translations
   types against observed metadata and estimate index build/write-lock time.
2. Run `apps/api/migrations/catalog-full-text-search.sql` once in the test SQL
   Editor. This creates3functions +1index; no catalog row/backfill/table/policy.
   An existing object with the same signature/name makes installation fail;
   investigate the conflict rather than dropping it or blind reapplying.
3. Run `docs/integrations/verify-installed-catalog-search.sql` as a single
   metadata-only SELECT: expect3PASS. Before install expect3CHUA_CAI. After pause
   expectRPCFAIL/indexPASS/invokerPASS. Checker does not search customer/catalog
   rows or send provider requests.
4. Explicitly enable CATALOG_FTS_ENABLED only in a dev/test backend using
   INTEGRATIONS_ENV=mock/killfalse, then restart. Keep Gemini/pgvector flags as
   currently configured; FTS is independent of either provider. No secret/key
   required for FTS besides the existing backend Supabase credential.
5. Query `/ai/product-advisor` or existing chat with a known item beyond the
   first100, accented/accentless terms, locale and a budget. Check
   advisor.searchEngine=postgres_fts/searchFallbackReason=null. Compare results
   with source DB, include hidden/out-of-stock cases and record hosted timing.
   A fake/memory catalog or only3metadataPASS is not hosted acceptance.

If RPC missing/paused/malformed/timeout, advisor returns searchEnginebounded_keyword,
candidateLimit100 and explicit searchFallbackReason. ValidemptyFTS stays empty.
Fallback availability depends on the original catalog read being available;
chat reports catalog-unavailable safely if both fail. A client-only URL/flag
cannot certify successful hosted installation.

## Rollback and next gates

Set CATALOG_FTS_ENABLED=false +restart; current bounded keyword search remains.
Optional `catalog-full-text-search.pause.sql` revokes search RPC, preserving
catalog/index/helpers. Do not drop source rows, functions used by an index, or
unknown objects as rollback. No destructive uninstall is shipped.

Chat default now uses catalog assistance and does not answer arbitrary generative
questions. Conversation history remains local client UI context; the server
does not use it for selection or external model prompts. Search is limited120chars;
budget-only followup asks for a product name. No semantic-history/FAQ/live-Gemini
acceptance claim. Current SDK package stays installed but its old call path has
been removed. Do not restore an unmanaged Gemini path as a fallback for FTS.

Remaining: owner-catalog FTS relevance/performance review, hosted install, real
model transport/token budget/data policy, notification transactional producers,
and other providers' account/durable/live gates. Synthetic recall alone does not
justify pgvector or embeddings cost. Production activation remains blocked.
