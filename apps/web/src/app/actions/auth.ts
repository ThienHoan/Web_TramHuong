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

export async function updatePassword(password: string) {
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
        console.log('[Server] Updating password...');

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('[Server] No user found:', userError);
            return { success: false, error: 'Session expired' };
        }

        console.log('[Server] User found:', user.id, user.email);

        // WORKAROUND for magic link users:
        // Supabase auto-generates a password during magic link auth.
        // Direct updateUser may fail with same_password if user input matches the auto-generated one.
        // Solution: Try direct update first. If it fails with same_password, use two-step approach.

        console.log('[Server] Attempting direct password update...');
        const { error: directError } = await supabase.auth.updateUser({
            password: password
        });

        if (!directError) {
            console.log('[Server] Direct password update successful');
            return { success: true };
        }

        // If direct update failed with same_password error, use two-step workaround
        if (directError.code === 'same_password') {
            console.log('[Server] same_password detected, trying two-step workaround...');

            // Step 1: Set a temporary random password
            const tempPassword = `TempPass${Math.random().toString(36).substring(2)}${Date.now()}!Zz1`;
            console.log('[Server] Setting temporary password...');

            const { error: tempError } = await supabase.auth.updateUser({
                password: tempPassword
            });

            if (tempError) {
                console.error('[Server] Temporary password update failed:', tempError);
                return { success: false, error: 'Unable to update password. Please try a different password.' };
            }

            // Step 2: Set the actual password (guaranteed to be different from temp)
            console.log('[Server] Setting final password...');
            const { error: finalError } = await supabase.auth.updateUser({
                password: password
            });

            if (finalError) {
                console.error('[Server] Final password update failed:', finalError);
                return { success: false, error: finalError.message };
            }

            console.log('[Server] Two-step password update successful');
            return { success: true };
        }

        // Other errors
        console.error('[Server] Password update failed:', directError);
        return { success: false, error: directError.message };
    } catch (e: any) {
        console.error('[Server] Exception during password update:', e);
        return { success: false, error: e.message || 'Update failed' };
    }
}
