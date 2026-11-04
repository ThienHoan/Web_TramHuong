import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTEGRATION_REGISTRY } from '../integrations/integrations.module';
import type { IntegrationRegistry } from '../integrations/integrations.config';
import { LocalDebugEventService } from './local-debug-event.service';

@Injectable()
export class CollectionPolicyService {
  private readonly purchaseEnabled: boolean;
  constructor(
    @Inject(INTEGRATION_REGISTRY)
    private readonly registry: IntegrationRegistry,
    private readonly config: ConfigService,
    @Optional() private readonly localDebug?: LocalDebugEventService,
  ) {
    const raw = config.get<unknown>('FEATURE_GA4_PURCHASE_ENABLED');
    if (
      raw !== undefined &&
      raw !== true &&
      raw !== false &&
      raw !== 'true' &&
      raw !== 'false'
    )
      throw new Error('FEATURE_GA4_PURCHASE_ENABLED must be true or false');
    this.purchaseEnabled = raw === true || raw === 'true';
  }

  isPurchaseEnabled(): boolean {
    return this.getPolicy().purchaseEnabled;
  }

  getPolicy(): {
    mode: 'disabled' | 'mock' | 'unavailable';
    purchaseEnabled: boolean;
    localDebug?: { enabled: true; measurementId: string; funnelEnabled?: true };
  } {
    const mode =
      this.registry.ga4.mode === 'disabled'
        ? 'disabled'
        : this.registry.ga4.mode === 'mock' &&
            ['development', 'test'].includes(
              this.config.get<string>('NODE_ENV') ?? '',
            )
          ? 'mock'
          : 'unavailable';
    const debug = mode === 'mock' ? this.localDebug?.policy() : undefined;
    return {
      mode,
      purchaseEnabled: mode === 'mock' && this.purchaseEnabled,
      ...(debug
        ? {
            localDebug: {
              ...debug,
              ...(this.localDebug?.funnelEnabled()
                ? { funnelEnabled: true as const }
                : {}),
            },
          }
        : {}),
    };
  }
}
