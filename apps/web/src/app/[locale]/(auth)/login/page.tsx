
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

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: {
                                        redirectTo: `${window.location.origin}/auth/callback`
                                    }
                                });
                            }}
                            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                            <span className="sr-only">Sign in with Google</span>
                            <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .533 5.333.533 12S5.867 24 12.48 24c3.44 0 6.24-1.133 8.16-3.293 1.953-2.187 2.507-5.32 2.507-7.48 0-.667-.08-1.4-.2-1.933h-10.47z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                supabase.auth.signInWithOAuth({
                                    provider: 'facebook',
                                    options: {
                                        redirectTo: `${window.location.origin}/auth/callback`
                                    }
                                });
                            }}
                            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                            <span className="sr-only">Sign in with Facebook</span>
                            <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-center text-sm text-gray-600">
                    <button onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')} className="underline">
                        {mode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                    </button>
                </div>
            </div>
        </div>
    );
}
