import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
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
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException();
        }

        try {
            const client = this.supabaseService.getClient();
            const { data: { user }, error } = await client.auth.getUser(token);

            if (error || !user) {
                throw new UnauthorizedException();
            }

            // Fetch role from public.users to ensure up-to-date permissions
            // We use the service role client if we want to bypass RLS, but here we can't easily.
            // Ideally, the user token has RLS to read their own role.
            // But for Admin check, we might need to trust the token or fetch from DB with admin privileges.
            // Since SupabaseService uses Service Role Key, we can query users table freely.

            const { data: userData, error: roleError } = await client
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (roleError || !userData) {
                // Fallback or treat as customer
                request.user = { ...user, role: 'CUSTOMER' };
            } else {
                request.user = { ...user, role: userData.role };
            }

            return true;
        } catch {
            throw new UnauthorizedException();
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
