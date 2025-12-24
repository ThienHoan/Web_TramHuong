
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
        const { data, error } = await supabase
            .from('users')
            .select('id, role, full_name, avatar_url, email')
            .eq('id', userId)
            .single();

        if (data) {
            console.log('AuthProvider: Fetched profile', data);
            setProfile(data as UserProfile);
            setRole(data.role as Role);
        } else {
            console.log('AuthProvider: No profile found for user', userId, error);
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.access_token) {
                setAccessToken(session.access_token);
            } else {
                setAccessToken('');
            }

            if (session?.user) {
                await fetchProfile(session.user.id);
            }

            setLoading(false);

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.access_token) {
                    setAccessToken(session.access_token);
                } else {
                    setAccessToken('');
                }

                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setRole(null);
                }
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        };

        initializeAuth();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
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
