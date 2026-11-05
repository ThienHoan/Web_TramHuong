import { z } from "zod";
import { API_URL } from "@/services/base-http";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const metrics = z.object({
  key: z.string().max(300),
  clicks: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  ctr: z.number().min(0).max(1),
  position: z.number().finite().nonnegative().nullable(),
});
const pageMetrics = metrics.extend({
  key: z
    .string()
    .url()
    .max(300)
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
});
export const searchConsoleSchema = z.object({
  source: z.literal("mock"),
  mode: z.enum(["disabled", "blocked", "mock"]),
  property: z.literal("sc-domain:mock.example.invalid"),
  // database = opt-in TEST DB mock snapshot; still synthetic, never live GSC.
  persistence: z.enum(["process_memory", "database"]),
  schedulerEnabled: z.literal(false),
  topRowsOnly: z.literal(true),
  propertyTotals: z.literal(false),
  window: z
    .object({ startDate: date, endDate: date, currentStartDate: date })
    .nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
  lastAttemptAt: z.string().datetime().nullable(),
  lastError: z.string().max(64).nullable(),
  syncing: z.boolean(),
  freshness: z.enum(["never_synced", "fresh", "stale"]),
  latestDataDate: date.nullable(),
  missingDates: z.array(date).max(14),
  truncatedDates: z.array(date).max(14),
  comparisonComplete: z.boolean(),
  queries: z
    .array(
      metrics.extend({
        previousClicks: z.number().nonnegative().nullable(),
        clickChange: z.number().nullable(),
      }),
    )
    .max(20),
  pages: z.array(pageMetrics).max(20),
  opportunities: z.array(pageMetrics).max(10),
});
export type SearchConsoleReport = z.infer<typeof searchConsoleSchema>;

export async function fetchSearchConsole(
  token: string,
  sync = false,
): Promise<SearchConsoleReport> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${API_URL}/admin/seo/search-console/${sync ? "sync" : "summary"}`,
      {
        method: sync ? "POST" : "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(sync ? { "Content-Type": "application/json" } : {}),
        },
        ...(sync ? { body: JSON.stringify({ source: "mock" }) } : {}),
      },
    );
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "LIMIT"
          : response.status === 401 || response.status === 403
            ? "AUTH"
            : "UNAVAILABLE",
      );
    return searchConsoleSchema.parse(await response.json());
  } finally {
    clearTimeout(timer);
  }
}
