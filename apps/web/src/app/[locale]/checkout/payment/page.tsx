'use client';

import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { useEffect, useState, useRef } from 'react';
import { getOrderStatus, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCurrency } from '@/hooks/useCurrency';

export default function CheckoutPaymentPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { session } = useAuth();
    const { formatPrice } = useCurrency();
    const orderId = searchParams.get('id');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // SePay/VietQR Config (Should probably be environmental or API provided, but hardcoded template for now)
    // SePay standard format: https://qr.sepay.vn/img?bank={Bank}&acc={Acc}&template={Template}&amount={Amount}&des={Content}
    // We need Bank Code and Account Number. 
    // Assuming User Config: MBBank, 0000123456789.
    // I should create an ENV or Constant for these.
    // For now, I will use placeholders and ask user to configure.
    // Or better: Use the ENV vars if available: NEXT_PUBLIC_BANK_CODE, NEXT_PUBLIC_BANK_ACC, NEXT_PUBLIC_BANK_NAME.
    const BANK_CODE = process.env.NEXT_PUBLIC_BANK_CODE || 'MB';
    const BANK_ACC = process.env.NEXT_PUBLIC_BANK_ACC || '0333333333';
    const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'NGUYEN VAN A';

    useEffect(() => {
        // Allow guest users to view payment page (orderId is the only requirement)
        if (!orderId) return;

        // Set access token if user is logged in (for authenticated API calls)
        if (session?.access_token) {
            setAccessToken(session.access_token);
        }

        fetchOrder();

        // Start Polling for payment status updates
        pollingRef.current = setInterval(checkPaymentStatus, 3000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [orderId, session?.access_token]);

    // Countdown timer for payment deadline
    useEffect(() => {


        if (!order?.payment_deadline) {

            return;
        }

        const updateCountdown = () => {
            const deadline = new Date(order.payment_deadline).getTime();
            const now = Date.now();
            const diff = deadline - now;

            if (diff <= 0) {
                setTimeRemaining('EXPIRED');
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [order?.payment_deadline]);

    const fetchOrder = async () => {
        if (!orderId) return;
        try {
            const data = await getOrderStatus(orderId);
            if (data) {
                setOrder(data);
                setLoading(false);
                // If already paid, redirect
                if (data.payment_status === 'paid') {
                    router.push(`/checkout/success?id=${orderId}`);
                }
            } else {
                setError('Order not found');
                setLoading(false);
                // Stop polling when order not found
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            }
        } catch (e) {
            setError('Failed to load order');
            setLoading(false);
            // Stop polling on error
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }
    };

    const checkPaymentStatus = async () => {
        // Don't poll if there's an error
        if (!orderId || error) return;
        try {
            const data = await getOrderStatus(orderId);
            if (data && data.payment_status === 'paid') {
                router.push(`/checkout/success?id=${orderId}`);
            }
        } catch {
            // Silently fail polling - main fetchOrder handles errors
        }
    };

    // Calculate QR URL
    // Format: https://qr.sepay.vn/img?bank=[BANK]&acc=[ACC]&template=compact&amount=[AMOUNT]&des=[CONTENT]
    // Content structure: DH[orderId] (Shortened? UUID is too long for comfortable typing, but QR handles it).
    // Let's us just use the UUID for exact matching as implemented in backend.

    // order.total is already in VND from database
    // No conversion needed for VietQR payment
    const amountInVND = order ? Math.round(order.total) : 0;

    const qrUrl = order
        ? `https://qr.sepay.vn/img?bank=${BANK_CODE}&acc=${BANK_ACC}&template=compact&amount=${amountInVND}&des=${order.id}`
        : '';

    const downloadQR = async () => {
        if (!qrUrl) return;
        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vietqr-${order.id}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(qrUrl, '_blank');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFF9F0]">
            <div className="flex flex-col items-center gap-4">
                <span className="loading loading-spinner text-primary text-4xl"></span>
                <p className="text-text-main font-display">Đang tải thông tin thanh toán...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-[#FFF9F0] text-red-600 font-display">
            <div className="p-6 bg-white rounded-xl shadow-lg border border-red-200">
                <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    {error}
                </p>
                <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                    Về trang chủ
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-[#FFF9F0] font-display text-text-main antialiased selection:bg-primary selection:text-white bg-pattern-lotus min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-accent-gold/20 shadow-sm transition-all duration-300">
                <div className="bg-text-main text-accent-gold text-xs py-1.5 hidden md:block">
                    <div className="container mx-auto px-4 flex justify-between items-center">
                        <span className="font-medium">🎁 Freeship đơn hàng từ 500k toàn quốc</span>
                        <div className="flex gap-4 font-medium">
                            <Link href="/lookup" className="hover:text-white transition-colors">Tra cứu đơn hàng</Link>
                            <span className="text-white/20">|</span>
                            <Link href="/agency" className="hover:text-white transition-colors">Đại lý &amp; Phân phối</Link>
                        </div>
                    </div>
                </div>
                <div className="container mx-auto px-4 xl:px-8">
                    <div className="flex h-20 items-center justify-between gap-6">
                        <Link href="/" className="flex items-center gap-3 shrink-0 group cursor-pointer">
                            <div className="size-12 text-primary flex items-center justify-center bg-surface-accent rounded-full border border-accent-gold/30 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                                <span className="material-symbols-outlined text-3xl">spa</span>
                            </div>
                            <div>
                                <h1 className="font-serif text-2xl font-bold leading-none tracking-tight text-primary-dark">Thiên Phúc</h1>
                                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-text-main font-bold mt-0.5">Trầm Hương Việt</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 bg-surface-accent/10 relative py-12 lg:py-20 flex items-center justify-center">
                <div className="absolute inset-0 bg-pattern-lotus opacity-30 pointer-events-none"></div>
                <div className="container mx-auto px-4 max-w-5xl relative z-10">
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-accent-gold/30 flex flex-col lg:flex-row ring-1 ring-black/5">
                        {/* QR Code Section */}
                        <div className="lg:w-5/12 bg-[#F9F5F0] relative overflow-hidden flex flex-col items-center justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-dashed border-accent-gold/40">
                            <div className="absolute inset-0 bg-pattern-lotus opacity-10 mix-blend-multiply pointer-events-none"></div>
                            <div className="relative z-10 w-full flex flex-col items-center">
                                <h3 className="font-serif text-2xl font-bold text-primary-dark mb-6 text-center">Quét mã để thanh toán</h3>
                                <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-primary/20 mb-6 w-full max-w-[280px] relative">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-accent-gold text-2xl">qr_code_scanner</span>
                                            <span className="font-bold text-text-main text-sm">VietQR</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-blue-600 text-lg">payments</span>
                                            <span className="font-bold text-blue-600 italic text-sm">SePay</span>
                                        </div>
                                    </div>
                                    <div className="aspect-square w-full bg-white rounded-lg overflow-hidden relative border border-gray-100 p-1">
                                        <img
                                            alt="Quét mã VietQR"
                                            className="w-full h-full object-contain mix-blend-darken"
                                            src={qrUrl}
                                            onError={(e) => {
                                                // Fallback if generic QR fails? Actually SePay QR should be reliable.
                                                // Maybe show icon.
                                                (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg';
                                            }}
                                        />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full shadow-md">
                                            <span className="material-symbols-outlined text-accent-gold text-2xl">spa</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={downloadQR}
                                        className="mt-3 w-full flex items-center justify-center gap-2 bg-white hover:bg-surface-accent text-primary font-bold py-2 rounded-lg border border-primary/20 transition-colors text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">download</span>
                                        Tải ảnh QR
                                    </button>
                                    <div className="mt-3 flex justify-between items-center text-[10px] text-gray-500 font-medium">
                                        <span>Hỗ trợ 50+ Ngân hàng</span>
                                        <div className="flex gap-1 items-center">
                                            <span className="material-symbols-outlined text-sm">lock</span>
                                            <span>Bảo mật</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-text-sub text-sm text-center mb-6 px-4 font-medium opacity-80">
                                    Sử dụng <strong>App Ngân hàng</strong> hoặc <strong>Camera</strong> trên điện thoại để quét mã.
                                </p>

                                {order?.payment_deadline && (
                                    <div className="w-full bg-surface-accent/40 rounded-xl p-4 text-center border border-accent-gold/40 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-accent-gold"></div>
                                        <p className="text-xs font-bold text-trad-red uppercase tracking-widest mb-2 opacity-80">Thời hạn thanh toán</p>
                                        <div className="flex items-center justify-center gap-2 text-3xl font-mono font-bold text-primary-dark">
                                            <span className={`material-symbols-outlined text-3xl ${timeRemaining !== 'EXPIRED' ? 'animate-pulse text-trad-amber' : 'text-red-500'}`}>timer</span>
                                            <span>{timeRemaining === 'EXPIRED' ? 'Đã hết hạn' : timeRemaining}</span>
                                        </div>
                                        <p className="text-[11px] text-text-sub mt-2 italic font-medium">Đơn hàng sẽ tự động hủy nếu quá hạn</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Details Section */}
                        <div className="lg:w-7/12 p-8 lg:p-12 relative flex flex-col justify-center bg-white">
                            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                <span className="material-symbols-outlined text-9xl">local_florist</span>
                            </div>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-1 h-8 bg-primary rounded-full"></div>
                                <h2 className="font-serif text-3xl font-bold text-text-main">Thông tin chuyển khoản</h2>
                            </div>
                            <div className="space-y-6 relative z-10">
                                <div className="bg-surface-accent/20 rounded-xl p-4 border border-accent-gold/20">
                                    <label className="text-xs font-bold text-text-sub uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">attach_money</span> Số tiền cần thanh toán
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-baseline gap-1 text-4xl font-bold text-primary-dark font-serif">
                                            {formatPrice(amountInVND).replace('₫', '')} <span className="text-xl text-text-main font-sans">VNĐ</span>
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(amountInVND.toString())}
                                            className="p-2 hover:bg-black/5 rounded-full text-text-sub/50 hover:text-primary transition-colors"
                                            title="Sao chép số tiền"
                                        >
                                            <span className="material-symbols-outlined text-xl">content_copy</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-text-sub/70 mt-1 italic">
                                        (Bằng chữ: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountInVND)})
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-2 ml-1">Ngân hàng</label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-gray-50 border-gray-200 rounded-lg py-3 px-4 font-bold text-text-main focus:ring-0 focus:border-accent-gold/50 cursor-default"
                                                readOnly type="text" value={BANK_CODE}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">account_balance</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-2 ml-1">Chủ tài khoản</label>
                                        <div className="relative">
                                            <input
                                                className="w-full bg-gray-50 border-gray-200 rounded-lg py-3 px-4 font-bold text-text-main focus:ring-0 focus:border-accent-gold/50 cursor-default"
                                                readOnly type="text" value={BANK_NAME}
                                            />
                                            <span className="absolute right--3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400">person</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-2 ml-1">Số tài khoản</label>
                                    <div className="flex shadow-sm rounded-lg overflow-hidden group">
                                        <input
                                            className="flex-1 min-w-0 bg-gray-50 border-gray-200 border-r-0 rounded-l-lg py-3 px-3 md:px-4 font-mono text-lg font-bold text-text-main focus:ring-0 focus:border-accent-gold/50 cursor-default tracking-wider truncate"
                                            readOnly type="text" value={BANK_ACC}
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(BANK_ACC)}
                                            className="bg-surface-accent hover:bg-accent-gold border border-l-0 border-accent-gold/30 text-text-sub hover:text-white font-bold px-3 md:px-5 py-2 transition-all duration-300 flex items-center gap-2 whitespace-nowrap shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-lg">content_copy</span>
                                            <span>Sao chép</span>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-2 ml-1">Nội dung chuyển khoản</label>
                                    <div className="flex shadow-sm rounded-lg overflow-hidden mb-3">
                                        <input
                                            className="flex-1 min-w-0 bg-amber-50 border-amber-200 border-r-0 rounded-l-lg py-3 px-3 md:px-4 font-mono font-bold text-text-main focus:ring-0 focus:border-accent-gold cursor-default truncate text-sm"
                                            readOnly type="text" value={order?.id}
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(order?.id)}
                                            className="bg-primary hover:bg-primary-dark border border-l-0 border-primary text-white font-bold px-3 md:px-5 py-2 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap shrink-0"
                                        >
                                            <span className="material-symbols-outlined text-lg">content_copy</span>
                                            <span>Sao chép</span>
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-3 text-xs text-trad-red bg-red-50 p-3 rounded-lg border border-red-100">
                                        <span className="material-symbols-outlined text-lg shrink-0">warning</span>
                                        <span className="font-medium leading-relaxed">
                                            Lưu ý quan trọng: Bạn phải sao chép <strong>chính xác</strong> nội dung chuyển khoản ở trên để đơn hàng được kích hoạt tự động.
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <Link
                                    href="/"
                                    className="text-sm font-bold text-text-sub/60 hover:text-primary transition-colors flex items-center gap-1 group"
                                >
                                    <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                    Quay lại trang chủ
                                </Link>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => router.push('/account/orders')}
                                        className="flex-1 sm:flex-none px-6 py-3 rounded-lg border border-accent-gold/30 text-text-main font-bold hover:bg-surface-accent transition-colors text-sm"
                                    >
                                        Xem đơn hàng
                                    </button>
                                    <button
                                        onClick={checkPaymentStatus}
                                        className="flex-1 sm:flex-none px-8 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm uppercase tracking-wide flex items-center justify-center gap-2"
                                    >
                                        <span>Đã thanh toán</span>
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 text-center">
                        <p className="text-xs text-text-sub/50 font-medium">Thanh toán an toàn được bảo mật bởi SePay</p>
                    </div>
                </div>
            </main>

            <footer className="bg-background-dark text-white pt-20 pb-10 border-t-4 border-accent-gold">
                <div className="container mx-auto px-4 xl:px-8">
                    <p className="text-center text-sm text-gray-500">© 2024 Trầm Hương Thiên Phúc. Bảo lưu mọi quyền.</p>
                </div>
            </footer>
        </div>
    );
}
