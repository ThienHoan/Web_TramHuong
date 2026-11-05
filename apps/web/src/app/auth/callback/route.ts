import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { oauthRedirectOrigin, safeOAuthReturnPath } from '@/lib/oauth-return';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    let redirectOrigin = origin;
    try {
        redirectOrigin = oauthRedirectOrigin(request.url, process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV);
        const next = safeOAuthReturnPath(searchParams.get('next'));
        if (!code) return NextResponse.redirect(new URL('/auth/auth-code-error', redirectOrigin));
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
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
            return NextResponse.redirect(new URL('/auth/auth-code-error', redirectOrigin));
        }
        return NextResponse.redirect(new URL(next, redirectOrigin));
    } catch {
        console.error('OAUTH_CALLBACK_FAILED');
        return NextResponse.redirect(new URL('/auth/auth-code-error', redirectOrigin));
    }
}
