import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly reflector: Reflector
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        // Logic:
        // 1. If public AND no token -> Allow (Guest)
        // 2. If public AND token -> Validate token. If valid, set user. If invalid, ignore (or could throw, but better to treat as guest?). 
        //    Actually, if token is sent but invalid, it's safer to treat as guest (ignore) or warn. 
        //    But for this specific bug (logged in user making public request), we just need to ensure we populate req.user if token is valid.
        // 3. If private AND no token -> Throw
        // 4. If private AND token -> Validate. If invalid, Throw.

        if (isPublic && !token) {
            return true;
        }

        if (!token) {
            // Private route, no token
            throw new UnauthorizedException();
        }

        try {
            const client = this.supabaseService.getClient();
            const { data: { user }, error } = await client.auth.getUser(token);

            if (error || !user) {
                if (isPublic) return true; // Token invalid but route is public -> treat as guest
                throw new UnauthorizedException();
            }

            // Fetch role from public.users to ensure up-to-date permissions
            const { data: userData, error: roleError } = await client
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (roleError || !userData) {
                // Fallback or treat as customer
                (request as any).user = { ...user, role: 'CUSTOMER' };
            } else {
                (request as any).user = { ...user, role: userData.role };
            }

            return true;
        } catch (err) {
            if (isPublic) return true; // Fail safe for public routes
            throw new UnauthorizedException();
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
