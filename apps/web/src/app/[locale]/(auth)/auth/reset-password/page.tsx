'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { updatePassword } from '@/app/actions/auth';

export default function ResetPasswordPage() {
    const locale = useLocale();
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
            console.log('[Reset Password] Calling server updatePassword action...');

            // Use server action which has all the workaround logic
            const result = await updatePassword(password);

            console.log('[Reset Password] Server action result:', result);

            if (!result.success) {
                throw new Error(result.error || 'Failed to update password');
            }

            // Success! Password updated
            console.log('[Reset Password] Password updated successfully');

            try {
                // Get user email before signing out
                console.log('[Reset Password] Getting user email...');
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    console.error('[Reset Password] Error getting user:', userError);
                }
                const userEmail = user?.email || '';
                console.log('[Reset Password] User email:', userEmail);

                // Sign out to invalidate session - user must login with NEW password
                console.log('[Reset Password] Signing out...');
                const { error: signOutError } = await supabase.auth.signOut();
                if (signOutError) {
                    console.error('[Reset Password] Error signing out:', signOutError);
                }
                console.log('[Reset Password] Signed out successfully');

                // Redirect to login with success message and prefilled email
                console.log('[Reset Password] Redirecting to login...');
                router.push(`/login?message=password_reset_success&email=${encodeURIComponent(userEmail)}`);
            } catch (redirectErr: any) {
                console.error('[Reset Password] Error during redirect flow:', redirectErr);
                // Even if redirect fails, show success and let user manually go to login
                alert('Password updated successfully! Please login with your new password.');
                router.push('/login');
            }
        } catch (err: any) {
            console.error('[Reset Password] Error:', err);
            setError(err.message || 'Failed to reset password');
        } finally {
            // Always reset submitting state (important for when redirect is slow)
            console.log('[Reset Password] Resetting submitting state');
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
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
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
            </div >
        </div >
    );
}
