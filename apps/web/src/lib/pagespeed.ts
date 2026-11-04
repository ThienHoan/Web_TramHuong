import { z } from "zod";
import { API_URL } from "@/services/base-http";
export const pagespeedTargetId = z.enum([
  "home_vi",
  "home_en",
  "catalog_vi",
  "catalog_en",
  "product_vi",
  "product_en",
]);
const strategy = z.enum(["mobile", "desktop"]);
const nullableScore = z.number().min(0).max(100).nullable();
const nullableMs = z.number().min(0).max(600000).nullable();
const sample = z.object({
  source: z.literal("mock"),
  targetId: pagespeedTargetId,
  strategy,
  measuredAt: z.string().datetime(),
  storedAt: z.string().datetime(),
  lighthouseVersion: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-mock)?$/),
  lab: z.object({
    performanceScore: nullableScore,
    accessibilityScore: nullableScore,
    bestPracticesScore: nullableScore,
    seoScore: nullableScore,
    lcpMs: nullableMs,
    cls: z.number().min(0).max(100).nullable(),
    tbtMs: nullableMs,
  }),
  field: z.object({
    status: z.literal("unavailable"),
    reason: z.literal("MOCK_HAS_NO_FIELD_DATA"),
    lcpMs: z.null(),
    inpMs: z.null(),
    cls: z.null(),
  }),
});
const report = z
  .object({
    targetId: pagespeedTargetId,
    strategy,
    latest: sample.nullable(),
    history: z.array(sample).max(30),
    freshness: z.enum(["never_audited", "fresh", "stale"]),
    lastAttemptAt: z.string().datetime().nullable(),
    lastError: z.string().max(64).nullable(),
    comparison: z.object({
      status: z.enum([
        "no_baseline",
        "version_changed",
        "baseline_too_old",
        "partial",
        "comparable",
      ]),
      alerts: z
        .array(
          z.object({
            metric: z.enum(["performanceScore", "lcpMs", "cls", "tbtMs"]),
            previous: z.number().finite(),
            current: z.number().finite(),
            deterioration: z.number().finite().nonnegative(),
            threshold: z.number().finite().positive(),
          }),
        )
        .max(4),
    }),
  })
  .refine(
    (r) =>
      r.history.every(
        (s) => s.targetId === r.targetId && s.strategy === r.strategy,
      ) &&
      (!r.latest ||
        (r.latest.targetId === r.targetId && r.latest.strategy === r.strategy)),
    { message: "Mismatched audit pair" },
  );
export const pagespeedSchema = z
  .object({
    source: z.literal("mock"),
    mode: z.enum(["disabled", "mock", "blocked"]),
    persistence: z.literal("process_memory"),
    schedulerEnabled: z.literal(false),
    cacheHours: z.literal(24),
    historyPerPair: z.literal(30),
    running: z.boolean(),
    thresholds: z.object({
      performanceScore: z.number().positive(),
      lcpMs: z.number().positive(),
      cls: z.number().positive(),
      tbtMs: z.number().positive(),
    }),
    targets: z
      .array(
        z
          .object({
            id: pagespeedTargetId,
            path: z
              .string()
              .regex(/^\/(vi|en)(\/products(\/analytics-fixture)?)?$/),
            url: z
              .string()
              .url()
              .refine((value) => {
                if (!URL.canParse(value)) return false;
                const url = new URL(value);
                return (
                  url.origin === "https://mock.example.invalid" &&
                  !url.search &&
                  !url.hash &&
                  !url.username &&
                  !url.password
                );
              }),
            kind: z.enum(["home", "catalog", "product"]),
            locale: z.enum(["vi", "en"]),
          })
          .refine(
            (target) =>
              target.url === "https://mock.example.invalid" + target.path,
          ),
      )
      .length(6),
    reports: z.array(report).length(12),
    result: z.enum(["recorded", "cached"]).optional(),
  })
  .refine(
    (value) =>
      new Set(value.targets.map((t) => t.id)).size === 6 &&
      new Set(value.reports.map((r) => r.targetId + ":" + r.strategy)).size ===
        12,
  );
export const pagespeedIntent = z
  .object({ targetId: pagespeedTargetId, strategy })
  .strict();
export type PagespeedReport = z.infer<typeof pagespeedSchema>;
export type PagespeedIntent = z.infer<typeof pagespeedIntent>;
export async function fetchPagespeed(
  token: string,
  input?: PagespeedIntent,
): Promise<PagespeedReport> {
  const intent = input === undefined ? undefined : pagespeedIntent.parse(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${API_URL}/admin/seo/pagespeed/${intent ? "audits" : "summary"}`,
      {
        method: intent ? "POST" : "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(intent ? { "Content-Type": "application/json" } : {}),
        },
        ...(intent
          ? { body: JSON.stringify({ source: "mock", ...intent }) }
          : {}),
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "LIMIT"
          : response.status === 401 || response.status === 403
            ? "AUTH"
            : response.status === 409
              ? "BUSY"
              : "UNAVAILABLE",
      );
    return pagespeedSchema.parse(await response.json());
  } finally {
    clearTimeout(timer);
  }
}
