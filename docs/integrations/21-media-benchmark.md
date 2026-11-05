# P7-01 — media benchmark and conditional Cloudinary decision

Design before execution05/11/2026. Reuse existing StorageService (auto-rotate,
1600pxWebP82/main +480pxWebP78thumbnail, immutable public URL/cache) and NextImage
(AVIF/WebP negotiation, responsive sizes). Do not migrate or delete source files,
change storage/DNS/URLs, upload to Cloudinary or read account secrets.

Offline POC:12–13 existing editorial/reference photos (exclude3Dmaterial maps,
icons and logos), exercise exact current main/thumbnail settings and a local
AVIF50comparison. Record source/output dimensions/bytes, encoding time and
reference-aligned RGBPSNR (pixel diagnostic, not proof of perceived quality).
Record hashes and assert every source file is unchanged. Derivatives/contact
sheet only in a temporary directory. Inspect contact sheet for visual artifacts.

This measures local codecs and current pipeline, NOT Cloudinary's delivery,
credits/cache behavior, production transfer/TTFB/LCP/CWV or provider superiority.
Cloudinary remains conditional/deferred until an authorized account/CDN trial
has measured benefit over this baseline. A smaller local AVIF is already
compatible with NextImage; it does not by itself justify adding a provider.

No Cloudinary flag activation/account/billing/asset-mapping table. Keep original
URLs and media authoritative. Code/benchmark result/status appended after run.

## Executed local baseline — 05/11/2026

12repository editorial/reference assets processed and contact sheet inspected.
Total original876101bytes; current mainWebP82outputs494158bytes; localAVIF50
outputs270555bytes. Per-image sizes/timing/PSNR/hashes in media-benchmark-evidence.json.
One source JPEG grew under WebP82: aggregate reduction is not a guarantee for
every asset. Some references contain existing watermarks; this test did not
publish or certify them as owner production product photos. Hashes unchanged
12/12, source file writes0, uploads0, network0.

Decision: KEEP_EXISTING_STORAGE_CLOUDINARY_DEFERRED_PENDING_AUTHORIZED_CDN_BENCHMARK.
No Cloudinary adapter/CDN or real LCP measurements were tested. No activation
needed for existing image optimization. To reproduce run
`pnpm --dir apps/api run benchmark:media` (temporary output by default).
Keep output in a temporary directory. This does not alter product image URLs.
