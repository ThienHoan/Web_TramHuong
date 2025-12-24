'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useEffect, useState, useRef } from 'react';
import { getOrder, setAccessToken } from '@/lib/api-client';
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
        if (!session || !orderId) return;

        setAccessToken(session.access_token);
        fetchOrder();

        // Start Polling
        pollingRef.current = setInterval(checkPaymentStatus, 3000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [session, orderId]);

    // Countdown timer for payment deadline
    useEffect(() => {
        console.log('[Payment] Order data:', order);
        console.log('[Payment] payment_deadline:', order?.payment_deadline);

        if (!order?.payment_deadline) {
            console.log('[Payment] No payment_deadline found');
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
            const data = await getOrder(orderId);
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
            }
        } catch (e) {
            setError('Failed to load order');
            setLoading(false);
        }
    };

    const checkPaymentStatus = async () => {
        if (!orderId) return;
        const data = await getOrder(orderId);
        if (data && data.payment_status === 'paid') {
            router.push(`/checkout/success?id=${orderId}`);
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

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading payment info...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden flex flex-col md:flex-row">

                {/* Left: QR Code */}
                <div className="md:w-1/2 p-8 bg-blue-50 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-blue-100">
                    <h2 className="text-xl font-bold text-blue-900 mb-6">Scan to Pay</h2>
                    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                        <img src={qrUrl} alt="VietQR" className="w-64 h-64 object-contain" />
                    </div>
                    <p className="text-sm text-blue-800 text-center max-w-xs">
                        Open your banking app and scan the QR code to complete payment.
                    </p>

                    {/* Countdown Timer */}
                    {order.payment_deadline && (
                        <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg w-full max-w-xs">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">⏰</span>
                                <div className="flex-1">
                                    <p className="font-bold text-yellow-900 text-sm">Payment Deadline</p>
                                    <p className={`text-2xl font-mono font-bold ${timeRemaining === 'EXPIRED' ? 'text-red-600' : 'text-yellow-700'}`}>
                                        {timeRemaining === 'EXPIRED' ? '⚠️ Expired' : timeRemaining}
                                    </p>
                                    {timeRemaining !== 'EXPIRED' && (
                                        <p className="text-xs text-yellow-600 mt-1">
                                            Complete payment before timer expires
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {timeRemaining !== 'EXPIRED' && (
                        <div className="mt-4 flex items-center gap-2 text-blue-700 animate-pulse">
                            <span className="loading loading-spinner loading-sm"></span>
                            <span className="text-sm font-medium">Waiting for payment...</span>
                        </div>
                    )}
                </div>

                {/* Right: Transfer Details */}
                <div className="md:w-1/2 p-8">
                    <h1 className="text-2xl font-bold mb-6">Payment Details</h1>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Amount (VND)</label>
                            <p className="text-3xl font-bold text-gray-900">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountInVND)}
                            </p>
                            <p className="text-sm text-gray-500">
                                (~{formatPrice(order.total)})
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Bank Name</label>
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                <span className="font-medium">{BANK_CODE}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Account Number</label>
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                <span className="font-medium font-mono text-lg">{BANK_ACC}</span>
                                <button className="text-blue-600 text-sm font-bold hover:underline"
                                    onClick={() => navigator.clipboard.writeText(BANK_ACC)}>
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Account Name</label>
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                <span className="font-medium">{BANK_NAME}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Transfer Content</label>
                            <div className="flex items-center justify-between bg-yellow-50 p-3 rounded border border-yellow-200">
                                <span className="font-medium font-mono text-sm break-all">{order.id}</span>
                                <button className="text-blue-600 text-sm font-bold hover:underline flex-shrink-0 ml-2"
                                    onClick={() => navigator.clipboard.writeText(order.id)}>
                                    Copy
                                </button>
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">⚠️ You must copy the exact content code.</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t">
                        <button
                            onClick={() => router.push('/account/orders')}
                            className="w-full text-gray-500 hover:text-gray-900 text-sm"
                        >
                            I'll pay later, go to my orders &rarr;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
