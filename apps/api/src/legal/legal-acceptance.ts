import { BadRequestException } from '@nestjs/common';
import { Equals } from 'class-validator';

export const LEGAL_POLICY_VERSION = '2026-11-06.draft';
export class LegalAcceptanceDto {
  @Equals(true) accepted: true;
  @Equals(LEGAL_POLICY_VERSION) version: string;
}
export interface LegalReceipt {
  accepted: true;
  version: string;
  purpose: 'contact_response' | 'order_fulfilment_and_terms';
  recorded_at: string;
}
// Server timestamp. Do not accept a client-supplied timestamp, IP or identity.
export function legalReceipt(
  input: LegalAcceptanceDto | undefined,
  purpose: LegalReceipt['purpose'],
  enforced: boolean,
  now: () => Date = () => new Date(),
): LegalReceipt | undefined {
  if (input === undefined || input === null) {
    if (enforced) throw new BadRequestException('LEGAL_ACCEPTANCE_REQUIRED');
    return undefined;
  }
  if (input.accepted !== true || input.version !== LEGAL_POLICY_VERSION)
    throw new BadRequestException('LEGAL_ACCEPTANCE_INVALID');
  return {
    accepted: true,
    version: LEGAL_POLICY_VERSION,
    purpose,
    recorded_at: now().toISOString(),
  };
}
