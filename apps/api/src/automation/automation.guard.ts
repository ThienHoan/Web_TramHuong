import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { strictFlag } from '../integrations/strict-flag';

@Injectable()
export class AutomationGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    if (!strictFlag(this.config, 'AUTOMATION_ENABLED'))
      throw new NotFoundException();
    const expected = this.config.get<string>('AUTOMATION_API_TOKEN') ?? '';
    const header =
      context
        .switchToHttp()
        .getRequest<{ headers: { authorization?: string } }>().headers
        .authorization ?? '';
    // This token grants only health/alert-queue operations, never commerce APIs.
    if (
      expected.length < 43 ||
      expected.length > 256 ||
      !/^Bearer [A-Za-z0-9_-]{43,256}$/.test(header) ||
      !timingSafeEqual(
        createHash('sha256').update(header.slice(7)).digest(),
        createHash('sha256').update(expected).digest(),
      )
    ) {
      throw new UnauthorizedException('AUTOMATION_UNAUTHORIZED');
    }
    return true;
  }
}
