import { createServerClient } from '@supabase/ssr';
import { NextResponse, userAgent, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { localeCookie, resolveRootLocale } from './i18n/root-locale';

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname === '/') {
        const locale = resolveRootLocale({
            isBot: userAgent(request).isBot,
            preferredLocale: request.cookies.get(localeCookie.name)?.value,
            acceptLanguage: request.headers.get('accept-language'),
        });
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}`;
        const response = NextResponse.redirect(url, 307);
        // This decision belongs to one visitor and must never be cached for others.
        response.headers.set('Cache-Control', 'private, no-store');
        response.headers.set('Vary', 'Accept-Language, Cookie, User-Agent');
        return response;
    }

    // OAuth callbacks and their error page are global routes, not localized pages.
    if (request.nextUrl.pathname === '/auth/callback' || request.nextUrl.pathname === '/auth/auth-code-error') {
        return NextResponse.next();
    }
    // Set on the request itself: next-intl builds the returned response from these headers,
    // and the locale layout reads x-pathname to generate canonical and hreflang URLs.
    request.headers.set('x-pathname', request.nextUrl.pathname);

    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
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
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
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
            const { data: userData } = await supabase
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

            const locale = pathname.match(/^\/(vi|en)/)?.[1] || 'vi';
            // Rewrite to a non-existent path to trigger 404
            const url = request.nextUrl.clone();
            url.pathname = `/${locale}/404`;
            return NextResponse.rewrite(url, { status: 404 });
        }
    }

    let response = handleI18nRouting(request);

    // next-intl adds the missing locale with a temporary 307. Browser-language detection is
    // off, so "/products" always means "/vi/products": say so permanently, otherwise Google
    // keeps both URLs (Search Console listed /products/... and /policies/... separately).
    const location = response.headers.get('location');
    if (response.status === 307 && location) {
        const permanent = NextResponse.redirect(location, 308);
        response.headers.forEach((value, key) => {
            if (key !== 'location') permanent.headers.set(key, value);
        });
        response = permanent;
    }

    // Copy cookies from supabaseResponse (which has session updates/clearing) to the final response
    supabaseResponse.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
}

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)']
};
