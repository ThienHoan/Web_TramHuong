import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Json } from '../common/types/database.types';
import type { IntegrationProvider } from './integrations.config';
import type { IntegrationOutboxRow } from './integration-database.types';
import { IntegrationFailure } from './integration-executor';

export function canonicalJson(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

@Injectable()
export class IntegrationRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async enqueueMerchantMock(
    productId: string,
    action: string,
    fingerprint: string,
  ) {
    const result = await this.supabase
      .getClient()
      .rpc('integration_enqueue_merchant_mock', {
        p_product_id: productId,
        p_action: action,
        p_fingerprint: fingerprint,
      });
    if (result.error || !result.data)
      throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    return result.data;
  }

  async merchantIsCurrentMock(
    productId: string,
    generation: number,
    fingerprint: string,
  ) {
    const result = await this.supabase
      .getClient()
      .rpc('integration_merchant_is_current_mock', {
        p_product_id: productId,
        p_generation: generation,
        p_fingerprint: fingerprint,
      });
    if (result.error) throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    return result.data === true;
  }

  /** True only when the P8-03 fence migration is installed and not paused. */
  async merchantFenceReadyMock() {
    const result = await this.supabase
      .getClient()
      .rpc('integration_merchant_fence_ready_mock', {});
    return !result.error && result.data === true;
  }

  async merchantBeginSendMock(
    row: IntegrationOutboxRow,
  ): Promise<
    | { status: 'acquired'; fenceToken: string; generation: number }
    | { status: 'stale' | 'busy'; generation: number }
  > {
    if (!row.lease_token) throw new Error('INVALID_INTEGRATION_LEASE');
    const result = await this.supabase
      .getClient()
      .rpc('integration_merchant_begin_send_mock', {
        p_id: row.id,
        p_lease_token: row.lease_token,
        p_version: row.version,
      });
    const data = result.data as Record<string, Json> | null;
    if (
      result.error ||
      !data ||
      typeof data !== 'object' ||
      typeof data.generation !== 'number' ||
      typeof data.status !== 'string' ||
      !['acquired', 'stale', 'busy'].includes(data.status)
    )
      throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    if (data.status !== 'acquired')
      return {
        status: data.status as 'stale' | 'busy',
        generation: data.generation,
      };
    if (
      typeof data.fenceToken !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(data.fenceToken)
    )
      throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    return {
      status: 'acquired',
      fenceToken: data.fenceToken,
      generation: data.generation,
    };
  }

  async merchantEndSendMock(
    fenceToken: string,
    outcome: 'ACCEPTED' | 'UNKNOWN' | 'REJECTED',
  ) {
    const result = await this.supabase
      .getClient()
      .rpc('integration_merchant_end_send_mock', {
        p_fence_token: fenceToken,
        p_outcome: outcome,
      });
    if (result.error) throw new Error('INTEGRATION_STORE_UNAVAILABLE');
  }

  async merchantDeferMock(row: IntegrationOutboxRow) {
    if (!row.lease_token) throw new Error('INVALID_INTEGRATION_LEASE');
    const result = await this.supabase
      .getClient()
      .rpc('integration_merchant_defer_mock', {
        p_id: row.id,
        p_lease_token: row.lease_token,
        p_version: row.version,
      });
    if (result.error || !result.data)
      throw new Error('INTEGRATION_STORE_UNAVAILABLE');
  }

  async enqueueMock(
    provider: IntegrationProvider,
    key: string,
    event: string,
    kind: 'read' | 'mutation',
    payload: Record<string, Json>,
  ) {
    if (
      !/^[a-zA-Z0-9:_-]{1,250}$/.test(key) ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(event) ||
      Buffer.byteLength(canonicalJson(payload)) > 60000
    ) {
      throw new Error('INVALID_INTEGRATION_EVENT');
    }
    const db = this.supabase.getClient();
    const input = {
      provider,
      environment: 'mock',
      dedupe_key: key,
      event_type: event,
      operation_kind: kind,
      payload,
    };
    const inserted = await db
      .from('integration_outbox')
      .upsert(input, {
        onConflict: 'provider,environment,dedupe_key',
        ignoreDuplicates: true,
      })
      .select('*')
      .maybeSingle();
    if (inserted.error) throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    if (inserted.data) return inserted.data;
    const existing = await db
      .from('integration_outbox')
      .select('*')
      .eq('provider', provider)
      .eq('environment', 'mock')
      .eq('dedupe_key', key)
      .single();
    if (existing.error || !existing.data)
      throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    if (
      existing.data.event_type !== event ||
      existing.data.operation_kind !== kind ||
      canonicalJson(existing.data.payload) !== canonicalJson(payload)
    ) {
      throw new Error('INTEGRATION_DEDUPE_CONFLICT');
    }
    return existing.data;
  }

  async claimMock(
    provider: IntegrationProvider,
    limit = 10,
  ): Promise<IntegrationOutboxRow[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20)
      throw new Error('INVALID_INTEGRATION_CLAIM');
    const result = await this.supabase.getClient().rpc('integration_claim', {
      p_provider: provider,
      p_environment: 'mock',
      p_limit: limit,
      p_lease_seconds: 120,
    });
    if (result.error || !Array.isArray(result.data))
      throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    // Never invoke a callback for a record with an unexpected scope/lease.
    if (
      result.data.some(
        (row) =>
          row.provider !== provider ||
          row.environment !== 'mock' ||
          row.state !== 'WORKING' ||
          !row.lease_token ||
          !['read', 'mutation'].includes(row.operation_kind),
      )
    ) {
      throw new Error('INVALID_INTEGRATION_LEASE');
    }
    return result.data;
  }

  async reserveMockUsage(
    provider: IntegrationProvider,
    limit: number,
    metric: 'requests' | 'emails' = 'requests',
  ) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000)
      throw new Error('INVALID_MOCK_QUOTA');
    const result = await this.supabase
      .getClient()
      .rpc('integration_reserve_usage', {
        p_provider: provider,
        p_environment: 'mock',
        p_metric: metric,
        p_amount: 1,
        p_hard_limit: limit,
      });
    if (result.error?.code === 'PT429')
      throw new IntegrationFailure('QUOTA_EXCEEDED');
    if (result.error) throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    return result.data;
  }

  /** Durable budget for REAL calls (environment 'staging'); reserve before sending. */
  async reserveLiveUsage(
    provider: 'gemini',
    metric: 'requests' | 'tokens',
    amount: number,
    hardLimit: number,
  ) {
    const result = await this.supabase
      .getClient()
      .rpc('integration_reserve_live_usage', {
        p_provider: provider,
        p_metric: metric,
        p_amount: amount,
        p_hard_limit: hardLimit,
      });
    if (result.error?.code === 'PT429')
      throw new IntegrationFailure('QUOTA_EXCEEDED');
    if (result.error) throw new Error('INTEGRATION_STORE_UNAVAILABLE');
    return result.data;
  }

  async finish(
    row: IntegrationOutboxRow,
    outcome: 'ACCEPTED' | 'RETRY' | 'UNKNOWN' | 'DEAD',
    code?: string,
  ) {
    if (row.environment !== 'mock' || !row.lease_token)
      throw new Error('INVALID_INTEGRATION_LEASE');
    const result = await this.supabase.getClient().rpc('integration_finish', {
      p_id: row.id,
      p_lease_token: row.lease_token,
      p_version: row.version,
      p_outcome: outcome,
      ...(code ? { p_error_code: code } : {}),
    });
    if (result.error) throw new Error('INTEGRATION_FINISH_CONFLICT');
  }
}
