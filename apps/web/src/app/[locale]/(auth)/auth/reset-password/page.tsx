'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetPasswordPage() {
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Verify user has access (came from reset email)
        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                setHasAccess(true);
            } else {
                setError('Invalid or expired reset link');
            }
            setLoading(false);
        };

        checkAccess();
    }, []);

    const validatePassword = (pwd: string): boolean => {
        if (pwd.length < 8) {
            setError('Password must be at least 8 characters');
            return false;
        }
        if (!/[A-Z]/.test(pwd)) {
            setError('Password must contain at least one uppercase letter');
            return false;
        }
        if (!/[0-9]/.test(pwd)) {
            setError('Password must contain at least one number');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validatePassword(password)) return;

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setSubmitting(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            // Success - redirect to login
            alert('Password reset successfully!');
            router.push('/login');
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
                    <p className="text-red-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/auth/forgot-password')}
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                    >
                        Request New Link
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-2">Reset Password</h1>
                <p className="text-gray-600 mb-6">Enter your new password below.</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                        />
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 p-3 rounded text-sm">
                        <p className="font-medium mb-2">Password Requirements:</p>
                        <ul className="space-y-1 text-gray-600">
                            <li className={password.length >= 8 ? 'text-green-600' : ''}>
                                {password.length >= 8 ? '✓' : '○'} At least 8 characters
                            </li>
                            <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                                {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
                            </li>
                            <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                                {/[0-9]/.test(password) ? '✓' : '○'} One number
                            </li>
                        </ul>
                    </div>

                    <Button type="submit" disabled={submitting} className="w-full">
                        {submitting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
