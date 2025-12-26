'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VerifyPage() {
    const [loading, setLoading] = useState(true);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if user clicked magic link and has valid session
        const checkVerification = async () => {
            try {
                console.log('[Verify] Checking verification...');

                // First, check if there's a token_hash in the URL
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');

                // Or check query params for code
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');

                if (code) {
                    console.log('[Verify] Found OTP code, verifying...');
                    try {
                        // Verify OTP
                        const { data, error } = await supabase.auth.verifyOtp({
                            token_hash: code,
                            type: 'email'
                        });
                        console.log('[Verify] Verify OTP result:', { data, error });

                        if (error) {
                            console.error('[Verify] OTP verification failed:', error);
                            throw error;
                        }

                        if (data.session) {
                            console.log('[Verify] Session established from OTP');
                            setVerified(true);
                            setLoading(false);
                            return;
                        }
                    } catch (otpError: any) {
                        console.error('[Verify] OTP error:', otpError);
                        // Continue to session check
                    }
                }

                // Check for access token in hash (alternative flow)
                if (accessToken) {
                    console.log('[Verify] Found access token in URL hash');
                    setVerified(true);
                    setLoading(false);
                    return;
                }

                // Fallback: check existing session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                console.log('[Verify] Session check:', { session, sessionError });

                if (sessionError) throw sessionError;

                if (session) {
                    console.log('[Verify] Session found, user verified');
                    setVerified(true);
                    setLoading(false);
                } else {
                    console.log('[Verify] No session found');
                    setError('Invalid or expired verification link');
                    setLoading(false);
                }
            } catch (err: any) {
                console.error('[Verify] Verification error:', err);
                setError(err.message || 'Verification failed');
                setLoading(false);
            }
        };

        checkVerification();
    }, []);

    const validatePassword = (pwd: string): boolean => {
        if (pwd.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return false;
        }
        if (!/[A-Z]/.test(pwd)) {
            setPasswordError('Password must contain at least one uppercase letter');
            return false;
        }
        if (!/[0-9]/.test(pwd)) {
            setPasswordError('Password must contain at least one number');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const handlePasswordCreation = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        // Validation
        if (!validatePassword(password)) return;

        if (password !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setSubmitting(true);
        console.log('[Verify] Starting password creation...');

        try {
            // Check if we still have a valid session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            console.log('[Verify] Current session:', session);

            if (sessionError || !session) {
                throw new Error('Session expired. Please request a new verification link.');
            }

            // Update user with new password
            console.log('[Verify] Updating password...');
            const { data, error } = await supabase.auth.updateUser({
                password: password
            });

            console.log('[Verify] Update result:', { data, error });

            if (error) throw error;

            if (!data.user) {
                throw new Error('Failed to update password. Please try again.');
            }

            // Success! Redirect to home
            console.log('[Verify] Password created successfully, redirecting...');
            router.push('/');
        } catch (err: any) {
            console.error('[Verify] Error:', err);
            setPasswordError(err.message || 'Failed to create password');
            setSubmitting(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying your email...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold mb-4">Verification Failed</h1>
                    <p className="text-red-600 mb-6">{error}</p>
                    <p className="text-sm text-gray-600 mb-6">
                        The verification link may have expired or is invalid.
                    </p>
                    <button
                        onClick={() => router.push('/login')}
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // Success state - show password creation form
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
                    <p className="text-gray-600">Now create your password</p>
                </div>

                <form onSubmit={handlePasswordCreation} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                validatePassword(e.target.value);
                            }}
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

                    {passwordError && (
                        <Alert variant="destructive">
                            <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" disabled={submitting} className="w-full">
                        {submitting ? 'Creating...' : 'Create Password'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
