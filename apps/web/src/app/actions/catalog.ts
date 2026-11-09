'use server';

import { createServerClient } from '@supabase/ssr';
import { updateTag } from 'next/cache';
import { cookies } from 'next/headers';

/** Clears the storefront's cached catalog so an admin change shows on the next page load. */
export async function refreshCatalog(): Promise<boolean> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (data?.role !== 'ADMIN' && data?.role !== 'STAFF') return false;

    updateTag('products');
    updateTag('categories');
    return true;
}
