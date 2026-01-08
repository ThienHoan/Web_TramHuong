
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';

import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD'>('LOGIN');
    const [showCheckEmail, setShowCheckEmail] = useState(false);
    const router = useRouter();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const messageParam = searchParams.get('message');
    const emailParam = searchParams.get('email');

    // Prefill email if provided from password reset
    useEffect(() => {
        if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
        }
    }, [emailParam]);

    // Load saved email on mount if remember me was checked previously
    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        const wasRemembered = localStorage.getItem('rememberMe') === 'true';

        console.log('[Remember Me Load] savedEmail:', savedEmail);
        console.log('[Remember Me Load] wasRemembered:', wasRemembered);

        if (savedEmail && wasRemembered) {
            setEmail(savedEmail);
            setRememberMe(true);
            console.log('[Remember Me Load] ✅ Auto-filled email:', savedEmail);
        } else {
            console.log('[Remember Me Load] ❌ No saved email found');
        }
    }, []);

    // Password visibility toggle
    const [showPassword, setShowPassword] = useState(false);
    // Remember me state
    const [rememberMe, setRememberMe] = useState(false);

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

                // Save email preference for better UX (NOT password - security)
                // Session is already persistent by default in Supabase
                console.log('[Remember Me] Checkbox state:', rememberMe);
                console.log('[Remember Me] Email to save:', email.trim());

                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('rememberedEmail', email.trim());
                    console.log('[Remember Me] ✅ Saved to localStorage');
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('rememberedEmail');
                    console.log('[Remember Me] ❌ Removed from localStorage');
                }


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
            } else if (mode === 'SIGNUP') {
                // SIGNUP mode - check if email already exists first
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('email')
                    .eq('email', email.trim())
                    .single();

                if (existingUser) {
                    throw new Error('EMAIL_ALREADY_EXISTS');
                }

                // Email doesn't exist, proceed with OTP signup
                const { error } = await supabase.auth.signInWithOtp({
                    email: email.trim(),
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}/auth/verify`,
                        data: {
                            full_name: email.trim().split('@')[0],
                            avatar_url: '',
                        }
                    }
                });
                if (error) throw error;

                // Show check email message
                setShowCheckEmail(true);
            } else if (mode === 'FORGOT_PASSWORD') {
                // Forgot password mode - send reset email
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/auth/reset-password`
                });
                if (error) throw error;

                // Show check email message
                setShowCheckEmail(true);
            }
        } catch (err: unknown) {
            // Improve error messages for better UX
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            let errorMessage = errorMsg;

            // Map common Supabase auth errors to Vietnamese-friendly messages
            if (errorMsg === 'EMAIL_ALREADY_EXISTS') {
                errorMessage = 'EMAIL_EXISTS';
            } else if (errorMsg.includes('Invalid login credentials')) {
                errorMessage = 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
            } else if (errorMsg.includes('Email not confirmed')) {
                errorMessage = 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.';
            } else if (errorMsg.includes('User not found') || errorMsg.includes('No user found')) {
                errorMessage = 'Không tìm thấy tài khoản với email này.';
            } else if (errorMsg.includes('Invalid email')) {
                errorMessage = 'Email không hợp lệ. Vui lòng kiểm tra lại.';
            } else if (errorMsg.includes('Password should be')) {
                errorMessage = 'Mật khẩu phải có ít nhất 8 ký tự.';
            } else if (errorMsg.includes('Too many requests')) {
                errorMessage = 'Quá nhiều lần thử. Vui lòng đợi một lúc rồi thử lại.';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f8f7f5] dark:bg-[#221910] text-[#1c140d] dark:text-gray-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#d56d0b]/20 selection:text-[#d56d0b]">
            <style jsx global>{`
                .lattice-pattern {
                    background-color: #f8f7f5;
                    background-image: radial-gradient(#d56d0b 0.5px, transparent 0.5px), radial-gradient(#d56d0b 0.5px, #f8f7f5 0.5px);
                    background-size: 20px 20px;
                    background-position: 0 0, 10px 10px;
                    opacity: 0.05;
                }
                .dark .lattice-pattern {
                    background-color: #221910;
                    background-image: radial-gradient(#d56d0b 0.5px, transparent 0.5px), radial-gradient(#d56d0b 0.5px, #221910 0.5px);
                    opacity: 0.1;
                }
            `}</style>

            <TraditionalHeader />

            <main className="relative flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 lattice-pattern pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 to-transparent dark:from-orange-900/10 pointer-events-none"></div>
                <div className="relative w-full max-w-md">
                    <div className="bg-white dark:bg-[#1e150f] rounded-xl shadow-xl border border-[#e8dbce] dark:border-[#3e2b1e] overflow-hidden">
                        <div className="relative h-32 bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(180deg, rgba(213, 109, 11, 0.2) 0%, rgba(30, 21, 15, 0.9) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuAdSR04opfgwFmAWGzfn7jCXO4We20hf1Fz0jyGri4Ts4rNU2LExkjoprytRDMz8dECXjELo-KCHmr__NPJnat3-5SCu-vIIlpmVeBEhp7M_UlxBRErpHythTa2_j8CJjkpI0w12EDhHEAzXuOpYneO6ZYp-fQFVstsRuY4RBR5rleo5gqeUJWrNlHy7rDOZ8rZMAlN9z3-KHLXuU4opf0cdPeXGnGl7_UUiwNY68IKovkwoOEt4J-tgVHucHPcpII8EkZ1VKQMsqYH")' }}>
                            <div className="absolute bottom-4 left-6">
                                <h1 className="text-2xl font-bold text-white tracking-wide shadow-black drop-shadow-md">
                                    {showCheckEmail ? 'Kiểm tra Email' : (mode === 'LOGIN' ? 'Đăng Nhập' : mode === 'SIGNUP' ? 'Đăng Ký' : 'Quên Mật Khẩu')}
                                </h1>
                                <p className="text-orange-100 text-sm font-medium opacity-90">
                                    {showCheckEmail ? 'Vui lòng xác thực tài khoản' : mode === 'FORGOT_PASSWORD' ? 'Nhận link đặt lại mật khẩu' : 'Chào mừng quý khách quay trở lại'}
                                </p>
                            </div>
                        </div>
                        <div className="p-8 pt-6">
                            {showCheckEmail ? (
                                <div className="text-center">
                                    <div className="mb-4 text-6xl">📧</div>
                                    <p className="text-gray-600 mb-6">
                                        Chúng tôi đã gửi liên kết xác thực đến <strong>{email}</strong>
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowCheckEmail(false);
                                            setMode('LOGIN');
                                            setEmail('');
                                        }}
                                        className="text-[#d56d0b] text-sm underline font-bold"
                                    >
                                        ← Quay lại Đăng nhập
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {messageParam === 'password_reset_success' && (
                                        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded mb-4 text-sm font-medium border border-green-200 dark:border-green-800">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">✅</span>
                                                <span>Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập với mật khẩu mới.</span>
                                            </div>
                                        </div>
                                    )}
                                    {error && (
                                        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-medium border border-red-100">
                                            {error === 'EMAIL_EXISTS' ? (
                                                <>
                                                    <p>Email này đã được đăng ký trước đó. Bạn có thể:</p>
                                                    <div className="mt-2 flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setMode('LOGIN'); setError(null); }}
                                                            className="text-xs underline font-bold hover:text-red-700"
                                                        >
                                                            → Đăng nhập ngay
                                                        </button>
                                                        <span className="text-red-400">•</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setMode('FORGOT_PASSWORD'); setError(null); }}
                                                            className="text-[#d56d0b] hover:underline font-medium text-sm"
                                                        >
                                                            → Quên mật khẩu?
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                error
                                            )}
                                        </div>
                                    )}
                                    <form onSubmit={handleAuth} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-[#1c140d] dark:text-gray-200" htmlFor="email">
                                                {mode === 'FORGOT_PASSWORD' ? 'Email đã đăng ký' : 'Email hoặc Tên đăng nhập'}
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
                                                </div>
                                                <input
                                                    autoComplete="username"
                                                    className="block w-full pl-10 pr-3 py-3 border border-[#e8dbce] dark:border-[#5c402b] rounded-lg leading-5 bg-[#fcfaf8] dark:bg-[#1a120b] placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d56d0b]/50 focus:border-[#d56d0b] transition duration-150 ease-in-out sm:text-sm font-sans"
                                                    id="email"
                                                    name="email"
                                                    placeholder="Ví dụ: ten_dang_nhap"
                                                    required
                                                    type="email" // Changed to email for compatibility with auth logic, text is fine if logic handles username
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {mode === 'LOGIN' && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-bold text-[#1c140d] dark:text-gray-200" htmlFor="password">
                                                    Mật khẩu
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="material-symbols-outlined text-gray-400 text-xl">lock</span>
                                                    </div>
                                                    <input
                                                        autoComplete="current-password"
                                                        className="block w-full pl-10 pr-10 py-3 border border-[#e8dbce] dark:border-[#5c402b] rounded-lg leading-5 bg-[#fcfaf8] dark:bg-[#1a120b] placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d56d0b]/50 focus:border-[#d56d0b] transition duration-150 ease-in-out sm:text-sm font-sans"
                                                        id="password"
                                                        name="password"
                                                        placeholder="••••••••"
                                                        required
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
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
                                        )}

                                        <div className="flex items-center justify-between">
                                            {mode === 'LOGIN' && (
                                                <div className="flex items-center">
                                                    <input
                                                        className="h-4 w-4 text-[#d56d0b] focus:ring-[#d56d0b] border-gray-300 rounded cursor-pointer"
                                                        id="remember-me"
                                                        name="remember-me"
                                                        type="checkbox"
                                                        checked={rememberMe}
                                                        onChange={(e) => setRememberMe(e.target.checked)}
                                                    />
                                                    <label className="ml-2 block text-sm text-gray-600 dark:text-gray-400 cursor-pointer" htmlFor="remember-me">
                                                        Ghi nhớ
                                                    </label>
                                                </div>
                                            )}
                                            {mode === 'LOGIN' && (
                                                <div className="text-sm ml-auto">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setMode('FORGOT_PASSWORD'); setError(null); }}
                                                        className="font-medium text-[#d56d0b] hover:text-[#b05705] hover:underline transition-all"
                                                    >
                                                        Quên mật khẩu?
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <button
                                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-lg text-white bg-[#d56d0b] hover:bg-[#b05705] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d56d0b] transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                                                type="submit"
                                                disabled={loading}
                                            >
                                                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                                    <span className="material-symbols-outlined text-primary-200 group-hover:text-white">login</span>
                                                </span>
                                                {loading ? 'Đang xử lý...' : (mode === 'LOGIN' ? 'Đăng nhập' : mode === 'SIGNUP' ? 'Đăng ký ngay' : 'Gửi link đặt lại')}
                                            </button>
                                        </div>
                                    </form>
                                    <div className="mt-6">
                                        <div className="relative">
                                            <div aria-hidden="true" className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-[#e8dbce] dark:border-[#3e2b1e]"></div>
                                            </div>
                                            <div className="relative flex justify-center text-sm">
                                                <span className="px-3 bg-white dark:bg-[#1e150f] text-gray-500 dark:text-gray-400 font-sans">
                                                    Hoặc tiếp tục với
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-6 grid grid-cols-2 gap-3">
                                            <button
                                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e8dbce] dark:border-[#5c402b] bg-white dark:bg-[#1a120b] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-[#251a12] hover:border-[#d56d0b]/40 focus:outline-none focus:ring-2 focus:ring-[#d56d0b]/50 transition-all duration-200"
                                                type="button"
                                                onClick={() => {
                                                    supabase.auth.signInWithOAuth({
                                                        provider: 'google',
                                                        options: { redirectTo: `${window.location.origin}/auth/callback` }
                                                    });
                                                }}
                                            >
                                                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                                                    <path d="M12.0003 20.45c4.6461 0 8.0848-3.2306 8.0848-8.2045 0-.7439-.0667-1.3091-.2197-1.8409H12.0003v3.4886h4.6348c-.2863 1.2917-1.0022 2.1932-2.1954 2.8727l-.0232.1545 3.1894 2.4705.2211.0221c2.044-1.8841 3.2205-4.6614 3.2205-7.8546 0-.7704-.0841-1.4682-.2391-2.1409H20.45v2.1409h-3.4477v-3.4886h8.0848c.1527.6727.2368 1.3705.2368 2.1409 0 3.1932-1.1765 5.9705-3.2205 7.8546l-3.4338-2.6471z" fill="currentColor" fillOpacity="0" style={{ display: 'none' }}></path>
                                                    <path d="M12.0003 20.45c4.6461 0 8.0848-3.2306 8.0848-8.2045 0-.7439-.0667-1.3091-.2197-1.8409H12.0003v3.4886h4.6348c-.1996.9014-.775 1.8352-1.6356 2.4114l2.6447 2.0522c1.5492-1.4284 2.4431-3.534 2.4431-6.1386 0-.5852-.0614-1.1523-.1731-1.6991H12.0003v3.2386h4.5511c-.1318.8477-.6398 1.8159-1.6841 2.5159l2.7106 2.1032c1.5796-1.4557 2.4925-3.5932 2.4925-6.2307 0-.5511-.058-1.0886-.1648-1.6068H12.0003v3.2386h4.5511z" fill="currentColor" style={{ display: 'none' }}></path>
                                                    <path d="M20.0848 12.2455c0-.7439-.0667-1.3091-.2197-1.8409H12.0003v3.4886h4.6348c-.2863 1.2917-1.0022 2.1932-2.1954 2.8727l2.6447 2.0522c1.5492-1.4284 2.4431-3.534 2.4431-6.1386 0-.1455-.0045-.2909-.0125-.4341z" fill="#4285F4"></path>
                                                    <path d="M12.0003 20.45c2.1955 0 4.0409-.7273 5.4394-1.9841l-2.6447-2.0522c-.7295.4909-1.6636.7841-2.7947.7841-2.1557 0-3.9818-1.4568-4.6364-3.4136H4.632l-2.7152 2.0955C3.3003 18.5977 7.348 20.45 12.0003 20.45z" fill="#34A853"></path>
                                                    <path d="M7.3639 13.7841c-.1682-.5045-.2636-1.0432-.2636-1.6023s.0955-1.0977.2636-1.6023V7.2273H4.632C3.5275 9.4295 3.5275 11.9523 4.632 14.1545l2.7319-2.1386z" fill="#FBBC05"></path>
                                                    <path d="M12.0003 7.1136c1.1932 0 2.2659.4114 3.1091 1.2159l2.3318-2.3318C15.9934 4.5455 14.1389 3.6364 12.0003 3.6364 7.348 3.6364 3.3003 5.4886 1.9168 9.3841l2.7152 2.0955c.6545-1.9568 2.4807-3.4136 4.6364-3.4136z" fill="#EA4335"></path>
                                                </svg>
                                                Google
                                            </button>
                                            <button
                                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e8dbce] dark:border-[#5c402b] bg-white dark:bg-[#1a120b] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-[#251a12] hover:border-[#d56d0b]/40 focus:outline-none focus:ring-2 focus:ring-[#d56d0b]/50 transition-all duration-200"
                                                type="button"
                                                onClick={() => {
                                                    supabase.auth.signInWithOAuth({
                                                        provider: 'facebook',
                                                        options: { redirectTo: `${window.location.origin}/auth/callback` }
                                                    });
                                                }}
                                            >
                                                <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fillRule="evenodd"></path>
                                                </svg>
                                                Facebook
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-8 text-center">
                                        {mode === 'FORGOT_PASSWORD' ? (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Nhớ mật khẩu rồi?
                                                <button
                                                    type="button"
                                                    onClick={() => { setMode('LOGIN'); setError(null); }}
                                                    className="font-bold text-[#d56d0b] hover:text-[#b05705] ml-1 hover:underline focus:outline-none"
                                                >
                                                    Đăng nhập ngay
                                                </button>
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {mode === 'LOGIN' ? 'Bạn chưa có tài khoản?' : 'Bạn đã có tài khoản?'}
                                                <button
                                                    type="button"
                                                    onClick={() => { setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN'); setError(null); }}
                                                    className="font-bold text-[#d56d0b] hover:text-[#b05705] ml-1 hover:underline focus:outline-none"
                                                >
                                                    {mode === 'LOGIN' ? 'Đăng ký tài khoản mới' : 'Đăng nhập ngay'}
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#d56d0b] to-transparent opacity-50"></div>
                    </div>
                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
