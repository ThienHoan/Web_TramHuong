'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function checkSession() {
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
                        // Ignored
                    }
                },
            },
        }
    );

    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
            return { success: true };
        }
    } catch (e) {
        console.error('Server session check failed:', e);
    }

    return { success: false };
}
