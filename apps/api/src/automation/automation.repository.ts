import {
  Injectable,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export const EVENT_KINDS = ['order.created', 'contact.created'] as const;
export const OUTCOMES = ['CAPTURED', 'ACCEPTED', 'UNKNOWN', 'DEAD'] as const;
export type Outcome = (typeof OUTCOMES)[number];
export interface AutomationEvent {
  id: string;
  kind: (typeof EVENT_KINDS)[number];
  sourceId: string;
  createdAt: string;
  leaseToken: string;
}
interface RpcPort {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseEvent(value: unknown): AutomationEvent {
  const d = value as Record<string, unknown> | null;
  if (
    !d ||
    !['id', 'sourceId', 'leaseToken'].every(
      (k) => typeof d[k] === 'string' && UUID.test(d[k]),
    ) ||
    !EVENT_KINDS.includes(d.kind as AutomationEvent['kind']) ||
    typeof d.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(d.createdAt))
  ) {
    throw new ServiceUnavailableException('AUTOMATION_INVALID_EVENT');
  }
  // Explicit projection: a future DB column must never expose customer details.
  return {
    id: d.id as string,
    kind: d.kind as AutomationEvent['kind'],
    sourceId: d.sourceId as string,
    leaseToken: d.leaseToken as string,
    createdAt: new Date(d.createdAt).toISOString(),
  };
}
@Injectable()
export class AutomationRepository {
  constructor(private readonly supabase: SupabaseService) {}
  private async rpc(name: string, args: Record<string, unknown> = {}) {
    const client = this.supabase.getClient() as unknown as RpcPort;
    try {
      const { data, error } = await client.rpc(name, args);
      if (error?.code === 'PT409')
        throw new ConflictException('AUTOMATION_LEASE_CONFLICT');
      if (error)
        throw new ServiceUnavailableException('AUTOMATION_STORE_UNAVAILABLE');
      return data;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException('AUTOMATION_STORE_UNAVAILABLE');
    }
  }
  async claim() {
    const event = await this.rpc('ops_automation_claim');
    return event === null ? null : parseEvent(event);
  }
  async finish(id: string, leaseToken: string, outcome: Outcome) {
    const d = (await this.rpc('ops_automation_finish', {
      p_id: id,
      p_lease_token: leaseToken,
      p_outcome: outcome,
    })) as Record<string, unknown>;
    if (!d || d.id !== id || d.state !== outcome)
      throw new ServiceUnavailableException('AUTOMATION_INVALID_RECEIPT');
    return { id, state: outcome };
  }
  async ready() {
    try {
      const { error } = await this.supabase
        .getClient()
        .from('products')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(3000));
      if (error) throw new Error();
      return { status: 'ok', database: 'reachable' };
    } catch {
      throw new ServiceUnavailableException('AUTOMATION_DATABASE_UNAVAILABLE');
    }
  }
}
