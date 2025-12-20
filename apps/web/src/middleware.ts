import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check for protected Admin routes
    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname.includes('/admin');

    // Debug Log
    console.log(`[Middleware] Path: ${pathname}, User: ${user?.email || 'None'}`);

    if (isAdminRoute) {
        if (!user) {
            console.log('[Middleware] No user, redirecting to Login');
            const locale = pathname.match(/^\/(vi|en)/)?.[1] || 'en';
            const logUrl = request.nextUrl.clone();
            logUrl.pathname = `/${locale}/login`;

            // Create redirect response
            const response = NextResponse.redirect(logUrl);

            // CRITICAL: Copy cookies from supabaseResponse (which has updated session) to the redirect response
            // This prevents "Login Loop" where token is refreshed but redirect loses the new cookie
            supabaseResponse.cookies.getAll().forEach(cookie => {
                response.cookies.set(cookie.name, cookie.value, cookie);
            });

            return response;
        }

        // Fetch role
        const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = userData?.role;
        console.log(`[Middleware] Role Check: ${role} | Error: ${roleError?.message}`);

        // Strict check: Must be ADMIN or STAFF
        if (role !== 'ADMIN' && role !== 'STAFF') {
            console.log('[Middleware] Unauthorized Role, redirecting Home');
            const locale = pathname.match(/^\/(vi|en)/)?.[1] || 'en';
            const homeUrl = request.nextUrl.clone();
            homeUrl.pathname = `/${locale}/`;

            const response = NextResponse.redirect(homeUrl);
            // Copy cookies to redirect response
            supabaseResponse.cookies.getAll().forEach(cookie => {
                response.cookies.set(cookie.name, cookie.value, cookie);
            });
            return response;
        }
    }

    const response = handleI18nRouting(request);

    // Copy cookies from supabaseResponse (which has session updates/clearing) to the final response
    supabaseResponse.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
}

export const config = {
    matcher: ['/', '/(vi|en)/:path*']
};
