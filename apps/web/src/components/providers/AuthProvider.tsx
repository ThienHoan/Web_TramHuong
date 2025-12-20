
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: Role | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchRole = async (userId: string) => {
            // We can fetch from public 'users' table or rely on custom claims if we set them up.
            // For now, let's fetch from the public table as per our design.
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single();

            if (data) {
                console.log('AuthProvider: Fetched role', data.role);
                setRole(data.role as Role);
            } else {
                console.log('AuthProvider: No role found for user', userId, error);
            }
        };

        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchRole(session.user.id);
            }

            setLoading(false);

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchRole(session.user.id);
                } else {
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
        // Force a hard refresh to clear any client-side state/cache
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
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
