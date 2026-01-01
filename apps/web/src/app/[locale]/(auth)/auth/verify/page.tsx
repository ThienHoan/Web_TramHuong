'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { checkSession, updatePassword } from '@/app/actions/auth'; // Import server actions

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
        let mounted = true;
        let safetyTimer: NodeJS.Timeout;

        const handleSuccess = () => {
            if (mounted) {
                console.log('[Verify] Verification successful, clearing timer.');
                clearTimeout(safetyTimer);
                setVerified(true);
                setLoading(false);
            }
        };

        const handleFailure = (msg: string) => {
            if (mounted) {
                clearTimeout(safetyTimer); // Ensure timer doesn't fire later
                setError(msg);
                setLoading(false);
            }
        };

        // Safety timeout: Extended to 30s to allow for session propagation
        safetyTimer = setTimeout(() => {
            if (mounted) {
                console.warn('[Verify] Safety timeout triggered after 30s');
                // If this runs, it means success hasn't cancelled it yet
                setLoading(false);
                setError('Verification timed out. Please try again.');
            }
        }, 30000);

        // Check if user clicked magic link and has valid session
        const checkVerification = async () => {
            try {
                // First, check if there's a token_hash in the URL
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');

                // Or check query params for code
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');

                if (code) {
                    try {
                        console.log('[Verify] Attempting code exchange...');
                        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                        if (!mounted) return;

                        if (error) {
                            console.warn('[Verify] Code exchange failed:', error.message);

                            // Fallback: Poll for session with more attempts
                            let sessionFound = false;
                            for (let i = 0; i < 10; i++) {
                                if (!mounted) break;
                                console.log(`[Verify] Polling attempt ${i + 1}/10...`);
                                const { data: sessionData } = await supabase.auth.getSession();
                                if (sessionData.session) {
                                    sessionFound = true;
                                    console.log('[Verify] Session found via polling!');
                                    break;
                                }
                                await new Promise(r => setTimeout(r, 1000)); // Wait 1s between attempts
                            }

                            if (sessionFound) {
                                console.log('[Verify] Session found via polling after error.');
                                handleSuccess();
                                return;
                            }

                            throw error;
                        }

                        if (data.session) {
                            handleSuccess();
                            return;
                        }
                    } catch (otpError: any) {
                        console.error('[Verify] Exchange reported error:', otpError);

                        // Double check session one last time before failing
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (sessionData.session) {
                            console.log('[Verify] Session found in catch block.');
                            handleSuccess();
                            return;
                        }

                        throw otpError;
                    }
                }

                if (accessToken) {
                    handleSuccess();
                    return;
                }

                // Fallback: Check BOTH client and server session with retry polling
                console.log('[Verify] Checking sessions with polling...');

                let sessionConfirmed = false;
                for (let attempt = 0; attempt < 10; attempt++) {
                    if (!mounted) break;

                    console.log(`[Verify] Session check attempt ${attempt + 1}/10...`);

                    const [clientResult, serverResult] = await Promise.allSettled([
                        supabase.auth.getSession(),
                        checkSession()
                    ]);

                    // Check Server Session (Reference Truth)
                    let serverSuccess = false;
                    if (serverResult.status === 'fulfilled' && serverResult.value.success) {
                        serverSuccess = true;
                        console.log('[Verify] Server session confirmed!');
                    }

                    // Check Client Session
                    let clientSuccess = false;
                    if (clientResult.status === 'fulfilled' && clientResult.value.data.session) {
                        clientSuccess = true;
                        console.log('[Verify] Client session confirmed!');
                    }

                    if (serverSuccess || clientSuccess) {
                        sessionConfirmed = true;
                        handleSuccess();
                        return;
                    }

                    // Wait before next attempt (unless it's the last one)
                    if (attempt < 9) {
                        console.log(`[Verify] No session yet, waiting 1s before retry...`);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }

                // All attempts failed
                console.warn('[Verify] No session found after 10 attempts.');
                handleFailure('Invalid or expired verification link');

            } catch (err: any) {
                console.error('[Verify] Verification error:', err);
                handleFailure(err.message || 'Verification failed');
            }
        };

        checkVerification();

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
        };
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

        try {
            console.log('[Verify] Starting password creation...');

            // Check if we still have a valid session
            console.log('[Verify] Checking session...');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            console.log('[Verify] Session details:', {
                hasSession: !!session,
                hasUser: !!user,
                userId: user?.id,
                email: user?.email,
                emailConfirmed: user?.email_confirmed_at,
                error: sessionError || userError
            });

            if (sessionError || userError || !session || !user) {
                throw new Error('Session expired. Please request a new verification link.');
            }


            // Update password via Server Action (more reliable than client-side)
            console.log('[Verify] Calling server updatePassword...');
            const result = await updatePassword(password);

            console.log('[Verify] Server updatePassword result:', result);

            if (!result.success) {
                throw new Error(result.error || 'Failed to update password');
            }

            // Success! Redirect to home
            console.log('[Verify] Success! Redirecting...');
            router.push('/');
        } catch (err: any) {
            console.error('[Verify] Error in handlePasswordCreation:', err);
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
