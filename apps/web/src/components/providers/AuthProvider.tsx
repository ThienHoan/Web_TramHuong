
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/api-client';

type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: Role | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

export interface UserProfile {
    id: string;
    role: Role;
    full_name?: string;
    avatar_url?: string;
    email?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<Role | null>(null); // Keep for backward compatibility if needed, or derive from profile
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from('users')
            .select('id, role, full_name, avatar_url, email')
            .eq('id', userId)
            .single();

        if (data) {

            setProfile(data as UserProfile);
            setRole(data.role as Role);
        } else {

        }
    };

    useEffect(() => {
        let active = true;
        let version = 0;
        let profileUserId: string | null = null;
        let appliedToken: string | null = null;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                const userId = session?.user.id ?? null;
                // Supabase re-emits SIGNED_IN whenever the tab regains focus. Treating that as a
                // new login blanked the admin layout and discarded everything on screen.
                if (event === 'SIGNED_IN' && userId && userId === profileUserId && session?.access_token === appliedToken) return;

                appliedToken = session?.access_token ?? null;
                setSession(session);
                setUser(session?.user ?? null);
                setAccessToken(session?.access_token ?? '');

                // Token refreshes keep the same account, so the loaded role is still valid.
                if (userId && userId === profileUserId) return;

                const currentVersion = ++version;
                profileUserId = userId;
                if (userId) {
                    setProfile(null);
                    setRole(null);
                    setLoading(true);
                    // Defer database work until after the auth callback releases its lock.
                    setTimeout(async () => {
                        try {
                            const { data } = await supabase.from('users')
                                .select('id, role, full_name, avatar_url, email')
                                .eq('id', userId).single();
                            if (active && currentVersion === version) {
                                setProfile(data as UserProfile | null);
                                setRole((data?.role as Role) ?? null);
                                // Let a later auth event retry a failed lookup.
                                if (!data) profileUserId = null;
                            }
                        } catch {
                            if (active && currentVersion === version) {
                                setProfile(null);
                                setRole(null);
                                profileUserId = null;
                            }
                        } finally {
                            if (active && currentVersion === version) setLoading(false);
                        }
                    }, 0);
                } else {
                    setProfile(null);
                    setRole(null);
                    setLoading(false);
                }
        });
        return () => { active = false; subscription.unsubscribe(); };
    }, []);

    const signOut = async () => {
        console.log('🚨 [SignOut] Function called!');
        try {
            // 1. Clear local state immediately
            setUser(null);
            setSession(null);
            setProfile(null);
            setRole(null);
            setAccessToken('');

            // 2. Clear localStorage - cart and chat history (preserve rememberMe preference!)
            localStorage.removeItem('cart');
            // Clear chat history for this user and guest
            if (user?.id) {
                localStorage.removeItem(`chat_history_${user.id}`);
            }
            localStorage.removeItem('chat_history_guest');
            // DON'T remove: rememberMe, rememberedEmail (user wants to stay remembered!)

            // 3. Sign out from Supabase
            await supabase.auth.signOut();

            // 4. Navigate using Next.js router with cache refresh
            router.replace('/');
            router.refresh();
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback to hard reload only on critical errors
            window.location.reload();
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, role, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
