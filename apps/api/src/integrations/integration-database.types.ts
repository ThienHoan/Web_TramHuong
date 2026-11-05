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
  seo_search_read_mock: { Args: Record<string, never>; Returns: Json };
  seo_search_begin_mock: { Args: Record<string, never>; Returns: Json };
  seo_search_complete_mock: {
    Args: {
      p_token: string;
      p_version: number;
      p_window: string[];
      p_days: Json;
      p_truncated: string[];
    };
    Returns: Json;
  };
  seo_search_fail_mock: {
    Args: { p_token: string; p_version: number; p_code: string };
    Returns: Json;
  };
  seo_pagespeed_read_mock: { Args: Record<string, never>; Returns: Json };
  seo_pagespeed_begin_mock: {
    Args: { p_target: string; p_strategy: string };
    Returns: Json;
  };
  seo_pagespeed_record_mock: {
    Args: { p_token: string; p_version: number; p_sample: Json };
    Returns: Json;
  };
  seo_pagespeed_fail_mock: {
    Args: { p_token: string; p_version: number; p_code: string };
    Returns: undefined;
  };
  integration_reconcile_shipment_notifications_mock: {
    Args: { p_after_id?: string; p_limit?: number };
    Returns: Json;
  };
  integration_resolve_shipment_notification_mock: {
    Args: { p_id: string; p_lease_token: string; p_version: number };
    Returns: Json;
  };
  integration_reconcile_notifications_mock: {
    Args: { p_after_id?: string; p_limit?: number };
    Returns: Json;
  };
  integration_enqueue_merchant_mock: {
    Args: { p_product_id: string; p_action: string; p_fingerprint: string };
    Returns: Json;
  };
  integration_merchant_is_current_mock: {
    Args: { p_product_id: string; p_generation: number; p_fingerprint: string };
    Returns: boolean;
  };
  integration_reserve_live_usage: {
    Args: {
      p_provider: string;
      p_metric: string;
      p_amount: number;
      p_hard_limit: number;
    };
    Returns: Json;
  };
  integration_ops_metrics_mock: {
    Args: { p_window_days?: number };
    Returns: Json;
  };
  integration_merchant_fence_ready_mock: {
    Args: Record<string, never>;
    Returns: boolean;
  };
  integration_merchant_begin_send_mock: {
    Args: { p_id: string; p_lease_token: string; p_version: number };
    Returns: Json;
  };
  integration_merchant_end_send_mock: {
    Args: { p_fence_token: string; p_outcome: string };
    Returns: undefined;
  };
  integration_merchant_defer_mock: {
    Args: { p_id: string; p_lease_token: string; p_version: number };
    Returns: Json;
  };
  integration_capture_notification_mock: {
    Args: { p_order_id: string; p_event: string };
    Returns: Json;
  };
  integration_resolve_notification_mock: {
    Args: { p_id: string; p_lease_token: string; p_version: number };
    Returns: Json;
  };
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
