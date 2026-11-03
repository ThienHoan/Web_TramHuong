import { HttpException } from '@nestjs/common';

export type ShippingErrorCode =
  | 'SHIPPING_DISABLED'
  | 'SHIPPING_AUTH_FAILED'
  | 'SHIPPING_VALIDATION_FAILED'
  | 'SHIPPING_RATE_LIMITED'
  | 'SHIPPING_TIMEOUT'
  | 'SHIPPING_UNAVAILABLE'
  | 'SHIPPING_INVALID_RESPONSE';

export class ShippingError extends HttpException {
  constructor(
    readonly code: ShippingErrorCode,
    readonly correlationId: string,
    readonly retryable = false,
  ) {
    const status = code === 'SHIPPING_VALIDATION_FAILED' ? 422 : 503;
    // The existing global filter preserves `error` and `message`. Never attach
    // an upstream cause/body: Nest/Pino may log the exception stack.
    super({ error: code, message: `${code} (${correlationId})` }, status);
  }
}
