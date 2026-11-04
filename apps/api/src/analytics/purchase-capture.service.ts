import {
  Injectable,
  ServiceUnavailableException,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
  HttpException,
} from '@nestjs/common';
import { CollectionPolicyService } from './collection-policy.service';
import { SupabaseService } from '../supabase/supabase.service';

export type PurchaseCaptureResult =
  | { source: 'none'; status: 'disabled' }
  | { source: 'mock'; status: 'not_eligible' }
  | { source: 'mock'; status: 'recorded' | 'duplicate'; transactionId: string };

@Injectable()
export class PurchaseCaptureService {
  constructor(
    private readonly policy: CollectionPolicyService,
    private readonly supabase: SupabaseService,
  ) {}

  async capture(
    orderId: string,
    actorId: string,
  ): Promise<PurchaseCaptureResult> {
    const mode = this.policy.getPolicy().mode;
    if (mode === 'disabled') return { source: 'none', status: 'disabled' };
    if (mode !== 'mock')
      throw new ServiceUnavailableException('PURCHASE_CAPTURE_BLOCKED');
    if (!this.policy.isPurchaseEnabled())
      return { source: 'none', status: 'disabled' };
    let result;
    try {
      result = await this.supabase
        .getClient()
        .rpc('integration_record_purchase_mock', {
          p_order_id: orderId,
          p_actor_id: actorId,
          p_consent: true,
        });
    } catch {
      throw new ServiceUnavailableException('PURCHASE_CAPTURE_UNAVAILABLE');
    }
    if (result.error) {
      switch (result.error.code) {
        case 'PT404':
          throw new NotFoundException('PURCHASE_NOT_FOUND');
        case 'PT409':
          throw new ConflictException('PURCHASE_CONFLICT');
        case 'PT422':
          throw new UnprocessableEntityException('PURCHASE_SNAPSHOT_INVALID');
        case 'PT429':
          throw new HttpException('PURCHASE_QUOTA_EXCEEDED', 429);
        case 'PGRST202':
        case '42P01':
          throw new ServiceUnavailableException(
            'PURCHASE_FOUNDATION_NOT_READY',
          );
        default:
          throw new ServiceUnavailableException('PURCHASE_CAPTURE_UNAVAILABLE');
      }
    }
    const value = result.data;
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value.source === 'mock'
    ) {
      if (value.status === 'not_eligible')
        return { source: 'mock', status: 'not_eligible' };
      if (
        (value.status === 'recorded' || value.status === 'duplicate') &&
        typeof value.transactionId === 'string' &&
        /^gp_mock_v1_[a-f0-9]{64}$/.test(value.transactionId)
      ) {
        return {
          source: 'mock',
          status: value.status,
          transactionId: value.transactionId,
        };
      }
    }
    throw new ServiceUnavailableException('PURCHASE_CAPTURE_UNAVAILABLE');
  }
}
