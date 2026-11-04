import type { Json } from '../common/types/database.types';

export type IntegrationOutboxRow = {
  id: string;
  provider: string;
  environment: string;
  dedupe_key: string;
  event_type: string;
  operation_kind: 'read' | 'mutation';
  payload: Json;
  state: 'QUEUED' | 'WORKING' | 'ACCEPTED' | 'DELIVERED' | 'UNKNOWN' | 'DEAD';
  attempts: number;
  version: number;
  lease_token: string | null;
  lease_until: string | null;
  next_at: string;
  provider_message_id: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationTables = {
  integration_outbox: {
    Row: IntegrationOutboxRow;
    Insert: Pick<
      IntegrationOutboxRow,
      'provider' | 'dedupe_key' | 'event_type' | 'operation_kind'
    > & {
      environment?: string;
      payload?: Json;
    };
    Update: Partial<IntegrationOutboxRow>;
    Relationships: [];
  };
  integration_usage_daily: {
    Row: {
      provider: string;
      environment: string;
      day: string;
      metric: string;
      used: number;
      hard_limit: number;
      warned_thresholds: number[];
      updated_at: string;
    };
    Insert: {
      provider: string;
      environment: string;
      day: string;
      metric: string;
      hard_limit?: number;
    };
    Update: { hard_limit?: number };
    Relationships: [];
  };
};

export type IntegrationFunctions = {
  integration_record_purchase_mock: {
    Args: { p_order_id: string; p_actor_id: string; p_consent: boolean };
    Returns: Json;
  };
  integration_claim: {
    Args: {
      p_provider: string;
      p_environment: string;
      p_limit?: number;
      p_lease_seconds?: number;
    };
    Returns: IntegrationOutboxRow[];
  };
  integration_finish: {
    Args: {
      p_id: string;
      p_lease_token: string;
      p_version: number;
      p_outcome: string;
      p_provider_message_id?: string;
      p_error_code?: string;
    };
    Returns: Json;
  };
  integration_reserve_usage: {
    Args: {
      p_provider: string;
      p_environment: string;
      p_metric: string;
      p_amount: number;
      p_hard_limit: number;
    };
    Returns: Json;
  };
};
