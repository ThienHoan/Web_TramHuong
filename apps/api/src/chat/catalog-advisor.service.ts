import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ProductsService } from '../products/products.service';
import { productPrice } from '../common/commerce-pricing';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { IntegrationExecutor } from '../integrations/integration-executor';
import type { CatalogAdvisorDto } from './catalog-advisor.contract';
import type { CatalogSearchRepository } from '../products/catalog-search.repository';
import { IntegrationFailure } from '../integrations/integration-executor';
import {
  buildGeminiRequest,
  catalogKeywords,
  estimateReservedTokens,
  redactShopperQuery,
  type GeminiLiveConfig,
  type GeminiLiveLimiter,
  type GeminiSelector,
} from './gemini-live';

/** Real Gemini path; reachable only through the staging gate below. */
export interface AdvisorLive {
  config: Extract<GeminiLiveConfig, { state: 'ready' }>;
  selector: GeminiSelector;
  limiter: GeminiLiveLimiter;
  usage: {
    reserveLiveUsage(
      provider: 'gemini',
      metric: 'requests' | 'tokens',
      amount: number,
      hardLimit: number,
    ): Promise<unknown>;
  };
}

export type CatalogCandidate = {
  id: string;
  slug: string;
  title: string;
  price: number;
  quantity: number;
};
type MockSelection = (
  candidates: readonly Readonly<CatalogCandidate>[],
  signal: AbortSignal,
) => Promise<unknown>;
type CatalogSnapshot = {
  items: CatalogCandidate[];
  searchEngine: 'bounded_keyword' | 'postgres_fts';
  catalogScope: 'first_100_active_in_stock' | 'matching_active_in_stock';
  candidateLimit: number;
  searchFallbackReason: string | null;
};
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const ignored = new Set([
  'toi',
  'muon',
  'mua',
  'tim',
  'san',
  'pham',
  'tu',
  'van',
  'cho',
  'and',
  'the',
  'want',
  'buy',
  'find',
]);

export class CatalogAdvisorService {
  private readonly logger = new Logger(CatalogAdvisorService.name);
  constructor(
    private readonly products: ProductsService,
    private readonly registry: IntegrationRegistry,
    private readonly executor: IntegrationExecutor,
    private readonly nodeEnv: string,
    private readonly selectMock: MockSelection = (candidates) =>
      Promise.resolve(candidates.slice(0, 3).map((p) => p.id)),
    private readonly search?: CatalogSearchRepository,
    private readonly live?: AdvisorLive,
  ) {}

  /** Real model only: flag on, staging, local NODE_ENV, valid live config. */
  liveReady() {
    const policy = this.registry.gemini;
    return (
      !!this.live &&
      policy.enabled &&
      policy.mode === 'blocked' &&
      policy.environment === 'staging' &&
      ['development', 'test'].includes(this.nodeEnv)
    );
  }

  private async selectLive(
    input: CatalogAdvisorDto,
    initial: CatalogCandidate[],
  ): Promise<{ ids: string[] } | { fallback: string }> {
    const live = this.live!;
    const candidates = initial
      .slice(0, 20)
      .map((p) => ({ id: p.id, title: p.title, priceVnd: p.price }));
    const request = {
      intent:
        live.config.payloadPolicy === 'redacted_query'
          ? {
              kind: 'redacted_query' as const,
              query: redactShopperQuery(input.query),
            }
          : {
              kind: 'catalog_keywords' as const,
              keywords: catalogKeywords(input.query, candidates),
              minPriceVnd: input.minPrice ?? null,
              maxPriceVnd: input.maxPrice ?? null,
            },
      locale: input.locale,
      candidates,
    };
    const reserved = estimateReservedTokens(
      buildGeminiRequest(live.config.model, request).input,
    );
    if (!live.limiter.take()) return { fallback: 'LIVE_RATE_LIMITED' };
    const started = Date.now();
    try {
      try {
        // Durable daily budget is reserved BEFORE any outbound byte; no refund.
        await live.usage.reserveLiveUsage(
          'gemini',
          'requests',
          1,
          live.config.dailyRequests,
        );
        await live.usage.reserveLiveUsage(
          'gemini',
          'tokens',
          reserved,
          live.config.dailyTokens,
        );
      } catch (error) {
        return {
          fallback:
            error instanceof IntegrationFailure
              ? 'LIVE_BUDGET_EXHAUSTED'
              : 'LIVE_BUDGET_STORE_UNAVAILABLE',
        };
      }
      let selection;
      try {
        selection = await live.selector.select(
          request,
          AbortSignal.timeout(12000),
        );
      } catch (error) {
        const code =
          error instanceof IntegrationFailure ? error.code : 'UNAVAILABLE';
        this.logger.warn({
          event: 'gemini_live',
          outcome: 'failed',
          code,
          ms: Date.now() - started,
        });
        return { fallback: 'LIVE_PROVIDER_' + code };
      }
      if (selection.totalTokens !== null && selection.totalTokens > reserved) {
        try {
          await live.usage.reserveLiveUsage(
            'gemini',
            'tokens',
            selection.totalTokens - reserved,
            live.config.dailyTokens,
          );
        } catch {
          this.logger.warn({
            event: 'gemini_live',
            outcome: 'usage_overrun_unrecorded',
          });
        }
      }
      // Counts and timing only: never the request text, titles or model output.
      this.logger.log({
        event: 'gemini_live',
        outcome: 'selected',
        model: live.config.model,
        selected: selection.ids.length,
        totalTokens: selection.totalTokens,
        reserved,
        ms: Date.now() - started,
      });
      return selection.ids.length
        ? { ids: selection.ids }
        : { fallback: 'LIVE_EMPTY_SELECTION' };
    } finally {
      live.limiter.release();
    }
  }

  async advise(input: CatalogAdvisorDto) {
    if ((input.minPrice ?? 0) > (input.maxPrice ?? Infinity))
      throw new BadRequestException('ADVISOR_INVALID_BUDGET');
    let snapshot = await this.candidates(input);
    const initial = snapshot.items;
    let candidates = initial,
      source: 'catalog' | 'mock' | 'gemini' = 'catalog';
    const liveReady = this.liveReady();
    let fallbackReason: string | null = liveReady
      ? 'LIVE_NO_CANDIDATES'
      : this.registry.gemini.mode !== 'mock'
        ? 'PROVIDER_DISABLED_OR_BLOCKED'
        : 'LOCAL_MOCK_ONLY';
    const canMock =
      this.registry.gemini.mode === 'mock' &&
      ['development', 'test'].includes(this.nodeEnv);
    if (liveReady && initial.length) {
      const result = await this.selectLive(input, initial);
      if ('ids' in result) {
        // Rebuild every authoritative field from a fresh public catalog read.
        const latest = await this.candidates(input);
        snapshot = latest;
        candidates = result.ids.flatMap((id) =>
          latest.items.filter((p) => p.id === id),
        );
        source = 'gemini';
        fallbackReason = candidates.length ? null : 'LIVE_SELECTION_STALE';
        if (!candidates.length) candidates = latest.items;
      } else {
        fallbackReason = result.fallback;
      }
    } else if (canMock && initial.length) {
      try {
        const selection = await this.executor.runMock(
          'gemini',
          'catalog_advice',
          'read',
          (signal) =>
            this.selectMock(
              Object.freeze(initial.map((p) => Object.freeze({ ...p }))),
              signal,
            ),
        );
        if (
          !Array.isArray(selection.data) ||
          selection.data.length > 5 ||
          selection.data.some((id: unknown) => typeof id !== 'string')
        )
          throw new Error('ADVISOR_INVALID_SELECTION');
        const known = new Set(initial.map((p) => p.id));
        const ids = [...new Set(selection.data as string[])].filter((id) =>
          known.has(id),
        );
        // Rebuild every authoritative field from a fresh public catalog read.
        const latest = await this.candidates(input);
        snapshot = latest;
        candidates = ids.flatMap((id) =>
          latest.items.filter((p) => p.id === id),
        );
        source = 'mock';
        fallbackReason = null;
      } catch {
        snapshot = await this.candidates(input);
        candidates = snapshot.items;
        fallbackReason = 'PROVIDER_UNAVAILABLE_OR_INVALID_SELECTION';
      }
    }
    return {
      source,
      liveModelAvailable: liveReady,
      fallbackReason,
      searchEngine: snapshot.searchEngine,
      candidateLimit: snapshot.candidateLimit,
      catalogScope: snapshot.catalogScope,
      searchFallbackReason: snapshot.searchFallbackReason,
      evaluatedAt: new Date().toISOString(),
      currency: 'VND',
      result: candidates.length ? 'matches' : 'no_match',
      recommendations: candidates.slice(0, 5).map((p) => ({
        ...p,
        reason: 'catalog_match',
        url: `/${input.locale}/products/${p.slug}`,
      })),
      limitations: [
        ...(snapshot.searchEngine === 'postgres_fts'
          ? ['LEXICAL_MATCHES_ONLY', 'NOT_VECTOR']
          : ['NOT_FTS_OR_VECTOR', 'NOT_FULL_CATALOG_RECALL']),
        'PRICE_AND_STOCK_RECHECKED_AT_CHECKOUT',
      ],
    };
  }

  private async candidates(input: CatalogAdvisorDto): Promise<CatalogSnapshot> {
    try {
      const fts = await this.search
        ?.search(input)
        .catch(
          () => ({ status: 'fallback', reason: 'FTS_UNAVAILABLE' }) as const,
        );
      const isFts = fts?.status === 'ready';
      const wrap = (items: CatalogCandidate[]): CatalogSnapshot => ({
        items,
        searchEngine: isFts ? 'postgres_fts' : 'bounded_keyword',
        candidateLimit: isFts ? 20 : 100,
        catalogScope: isFts
          ? 'matching_active_in_stock'
          : 'first_100_active_in_stock',
        searchFallbackReason:
          fts?.status === 'fallback'
            ? fts.reason
            : isFts
              ? null
              : 'FTS_DISABLED',
      });
      const catalog = isFts
        ? { data: fts.data }
        : await this.products.findAll(input.locale, {
            page: 1,
            limit: 100,
            stock_status: 'in_stock',
            ...(input.categoryId ? { category_id: input.categoryId } : {}),
          });
      if (
        !Array.isArray(catalog.data) ||
        catalog.data.length > (isFts ? 20 : 100)
      )
        throw new Error('INVALID_CATALOG');
      const tokens = [
        ...new Set(
          normalize(input.query)
            .split(' ')
            .filter((word) => word.length > 1 && !ignored.has(word)),
        ),
      ];
      if (!tokens.length && !isFts) return wrap([]);
      const now = new Date();
      const ranked = catalog.data.flatMap((p) => {
        if (
          p.is_active !== true ||
          typeof p.id !== 'string' ||
          typeof p.slug !== 'string' ||
          !Number.isSafeInteger(p.quantity) ||
          p.quantity <= 0 ||
          !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) ||
          !/^[a-zA-Z0-9_-]{1,200}$/.test(p.slug) ||
          typeof p.translation?.title !== 'string' ||
          !p.translation.title.trim() ||
          p.translation.title.length > 300 ||
          !Number.isSafeInteger(p.price) ||
          p.price <= 0 ||
          !Number.isFinite(p.discount_percentage) ||
          p.discount_percentage < 0 ||
          p.discount_percentage > 100 ||
          (input.categoryId && p.category_id !== input.categoryId) ||
          (p.variants !== null &&
            (!Array.isArray(p.variants) || p.variants.length > 0))
        )
          return [];
        for (const date of [p.discount_start_date, p.discount_end_date])
          if (date !== null && !Number.isFinite(Date.parse(date))) return [];
        if (
          p.discount_start_date &&
          p.discount_end_date &&
          Date.parse(p.discount_start_date) > Date.parse(p.discount_end_date)
        )
          return [];
        const { price } = productPrice(p, undefined, now);
        if (
          !Number.isSafeInteger(price) ||
          price <= 0 ||
          price < (input.minPrice ?? 0) ||
          price > (input.maxPrice ?? Infinity)
        )
          return [];
        const words = new Set(
          normalize(`${p.translation.title} ${p.slug}`).split(' '),
        );
        const score = isFts
          ? 'rank' in p && typeof p.rank === 'number'
            ? p.rank
            : 0
          : tokens.filter((token) => words.has(token)).length;
        if (!score) return [];
        return [
          {
            score,
            candidate: {
              id: p.id,
              slug: p.slug,
              title: p.translation.title,
              price,
              quantity: p.quantity,
            },
          },
        ];
      });
      ranked.sort(
        (a, b) =>
          b.score - a.score || a.candidate.id.localeCompare(b.candidate.id),
      );
      return wrap(ranked.slice(0, 20).map((p) => p.candidate));
    } catch {
      throw new ServiceUnavailableException('ADVISOR_CATALOG_UNAVAILABLE');
    }
  }
}
