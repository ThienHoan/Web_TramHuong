import {
    Injectable,
    CanActivate,
    ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * OptionalAuthGuard: Extracts user from token if present, but does NOT throw if missing/invalid.
 * Use this for endpoints that work for both guests and authenticated users (e.g., tracking).
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
    constructor(private readonly supabaseService: SupabaseService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request & { user?: any }>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            // No token - allow as guest
            return true;
        }

        try {
            const client = this.supabaseService.getClient();
            const { data: { user }, error } = await client.auth.getUser(token);

            if (!error && user) {
                // Populate user info for service to use
                request.user = { id: user.id, email: user.email };
            }
            // If error or no user, just proceed as guest (don't throw)
        } catch {
            // Silently fail - proceed as guest
        }

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
