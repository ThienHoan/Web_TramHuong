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


    if (isAdminRoute) {
        let hasAccess = false;

        if (user) {
            // Fetch role
            const { data: userData, error: roleError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            const role = userData?.role;


            if (role === 'ADMIN' || role === 'STAFF') {
                hasAccess = true;
            }
        } else {

        }

        if (!hasAccess) {

            const locale = pathname.match(/^\/(vi|en)/)?.[1] || 'en';
            // Rewrite to a non-existent path to trigger 404
            const url = request.nextUrl.clone();
            url.pathname = `/${locale}/404`;
            return NextResponse.rewrite(url);
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
