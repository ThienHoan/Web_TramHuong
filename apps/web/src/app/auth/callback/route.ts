import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const requestedNext = searchParams.get('next') ?? '/';
    const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\')
        ? requestedNext : '/';


    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        console.log('[Auth Callback] Exchanging code for session...');
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {

            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const forwardedProto = request.headers.get('x-forwarded-proto');
            const isLocalEnv = process.env.NODE_ENV === 'development';

            const protocol = forwardedProto || 'http'; // Default to http if not specified

            // If running on local, always use http (unless specified otherwise)
            // But here we rely on what Nginx tells us via x-forwarded-proto

            const redirectUrl = isLocalEnv
                ? `${origin}${next}`
                : (forwardedHost ? `${protocol}://${forwardedHost}${next}` : `${origin}${next}`);

            console.log('[Auth Callback] Redirecting to:', redirectUrl);
            return NextResponse.redirect(redirectUrl);
        } else {
            console.error('[Auth Callback] ❌ Session exchange failed:', error);
        }
    } else {
        console.error('[Auth Callback] ❌ No code parameter found in URL');
    }

    // return the user to an error page with instructions
    console.log('[Auth Callback] Redirecting to error page');
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
