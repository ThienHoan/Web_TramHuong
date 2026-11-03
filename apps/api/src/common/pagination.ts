import { BadRequestException } from '@nestjs/common';

export function pagination(pageInput: unknown = 1, limitInput: unknown = 20) {
  const page = Number(pageInput ?? 1);
  const limit = Number(limitInput ?? 20);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new BadRequestException('Invalid pagination: page >= 1 and limit between 1 and 500 required');
  }
  return { page, limit };
}
