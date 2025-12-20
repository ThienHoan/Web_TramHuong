
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/routing';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'LOGIN') {
                const { data: { user }, error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password
                });
                if (error) throw error;
                if (!user) throw new Error('No user found');


                // Initial redirect to home, or check role for specific dashboard
                // Fetch public profile to get role
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                const role = profile?.role || 'CUSTOMER';

                if (role === 'ADMIN') {
                    router.push('/admin/dashboard');
                } else if (role === 'STAFF') {
                    // Can direct to a general staff page or orders
                    router.push('/admin/orders');
                } else {
                    router.push('/');
                }
            } else {
                const { error, data } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        data: {
                            full_name: email.trim().split('@')[0], // Default name from email
                            avatar_url: '',
                        }
                    }
                });
                if (error) throw error;
                // If auto-confirm is enabled, they might allow login immediately, 
                // otherwise alert check email.
                if (data.user && data.session) {
                    // Check if session exists (auto confirm)
                    router.push('/');
                } else {
                    alert('Check your email for confirmation link!');
                    setMode('LOGIN');
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-6 text-center">
                    {mode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}
                </h1>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (mode === 'LOGIN' ? 'Log In' : 'Sign Up')}
                    </button>
                </form>

                <div className="mt-4 text-center text-sm text-gray-600">
                    <button onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} className="underline">
                        {mode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                    </button>
                </div>
            </div>
        </div>
    );
}
