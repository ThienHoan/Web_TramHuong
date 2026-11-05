import { z } from "zod";
import { API_URL } from "@/services/base-http";

const provider = z.enum([
  "ghn",
  "resend",
  "gemini",
  "pgvector",
  "cloudinary",
  "google",
  "ga4",
  "search_console",
  "merchant",
  "pagespeed",
  "turnstile",
]);
const count = z.number().int().nonnegative().max(1e9);
const errorCode = z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/);
// Numbers only ever come from TEST DB mock aggregates (metricsSource=test_db_mock).
const metrics = z.object({
  available: z.boolean(),
  lastSuccessAt: z.string().datetime().nullable(),
  lastErrorCode: errorCode.nullable(),
  failRate: z.number().min(0).max(1).nullable(),
  quotaMetric: z.enum(["emails", "requests"]).nullable(),
  quotaUsed: z.number().int().nonnegative().max(1e12).nullable(),
  quotaLimit: z.number().int().nonnegative().max(1e12).nullable(),
  quotaAlert: z
    .enum(["ok", "warn_60", "warn_80", "warn_95", "exhausted"])
    .nullable(),
  backlog: z
    .object({
      queued: count,
      working: count,
      accepted: count,
      unknown: count,
      dead: count,
    })
    .nullable(),
  inflight: count.nullable(),
  // Budget reserved for REAL provider calls today (TEST DB, staging rows).
  liveUsage: z
    .object({
      requestsUsed: z.number().int().nonnegative().max(1e12),
      requestsLimit: z.number().int().positive().max(1e12),
      tokensUsed: z.number().int().nonnegative().max(1e12),
      tokensLimit: z.number().int().positive().max(1e12),
      alert: z.enum(["ok", "warn_60", "warn_80", "warn_95", "exhausted"]),
    })
    .refine(
      (u) => u.requestsUsed <= u.requestsLimit && u.tokensUsed <= u.tokensLimit,
    )
    .nullable(),
  estimatedMonthlySpend: z.null(),
});
const emptyMetrics = (m: z.infer<typeof metrics>) =>
  !m.available &&
  [
    m.lastSuccessAt,
    m.lastErrorCode,
    m.failRate,
    m.quotaMetric,
    m.quotaUsed,
    m.quotaLimit,
    m.quotaAlert,
    m.backlog,
    m.inflight,
    m.liveUsage,
  ].every((value) => value === null);
export const integrationHealthSchema = z
  .object({
    source: z.literal("configuration_and_documented_evidence"),
    observedAt: z.string().datetime(),
    probesPerformed: z.literal(false),
    releaseReady: z.literal(false),
    policyScope: z.literal("new_integration_paths_only"),
    financialSource: z.literal("internal_database"),
    metricsSource: z.enum([
      "unavailable_no_runtime_probe",
      "test_db_mock",
      "store_unavailable",
    ]),
    metricsObservedAt: z.string().datetime().nullable(),
    metricsWindowDays: z.literal(7).nullable(),
    liveUsageSource: z.enum(["test_db", "unavailable"]).nullable(),
    providers: z
      .array(
        z.object({
          provider,
          flag: z.string().max(80),
          enabled: z.boolean(),
          environment: z.enum(["mock", "staging", "production"]),
          mode: z.enum([
            "disabled",
            "mock",
            "blocked",
            "existing_shipping_policy",
          ]),
          fallback: z.string().max(80),
          implementation: z.enum(["mock", "reused", "conditional_deferred"]),
          evidence: z.string().max(100),
          legacyPathOutsideRegistry: z.boolean(),
          liveReadiness: z.literal("not_certified"),
          blockers: z
            .array(z.string().regex(/^[A-Z_]{1,100}$/))
            .min(1)
            .max(10),
          metrics,
        }),
      )
      .length(11),
  })
  .refine(
    (value) => new Set(value.providers.map((p) => p.provider)).size === 11,
    "Duplicate integrations",
  )
  .refine(
    (value) =>
      value.metricsSource === "test_db_mock"
        ? value.metricsObservedAt !== null &&
          value.metricsWindowDays === 7 &&
          value.liveUsageSource !== null &&
          (value.liveUsageSource === "test_db" ||
            value.providers.every((p) => p.metrics.liveUsage === null))
        : value.metricsObservedAt === null &&
          value.metricsWindowDays === null &&
          value.liveUsageSource === null &&
          value.providers.every((p) => emptyMetrics(p.metrics)),
    "Runtime numbers without a test DB source",
  );

export type IntegrationHealth = z.infer<typeof integrationHealthSchema>;

export async function fetchIntegrationHealth(
  token: string,
): Promise<IntegrationHealth> {
  if (!token) throw new Error("AUTH");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_URL}/integrations/admin/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok)
      throw new Error(
        [401, 403].includes(response.status) ? "AUTH" : "UNAVAILABLE",
      );
    const parsed = integrationHealthSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("INVALID_RESPONSE");
    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}
