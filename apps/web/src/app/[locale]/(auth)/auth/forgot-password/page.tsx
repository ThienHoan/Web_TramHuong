'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export default function ForgotPasswordPage() {
    const locale = useLocale();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/${locale}/auth/reset-password`
            });

            if (error) throw error;

            setSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
                    <div className="text-6xl mb-4">📧</div>
                    <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
                    <p className="text-gray-600 mb-6">
                        We've sent password reset instructions to <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        Click the link in the email to reset your password.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="text-blue-600 text-sm underline"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-2">Forgot Password?</h1>
                <p className="text-gray-600 mb-6">
                    Enter your email and we'll send you reset instructions.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/login')}
                        className="text-sm text-gray-600 hover:underline"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
