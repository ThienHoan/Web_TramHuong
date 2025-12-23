'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function CheckoutSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const orderId = searchParams.get('id');

    useEffect(() => {
        if (!orderId) {
            router.push('/');
        }
    }, [orderId, router]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">Order Placed Successfully!</h1>
                <p className="text-gray-600 mb-6">Thank you for your purchase. We have received your order and will process it shortly.</p>

                {orderId && (
                    <p className="text-sm text-gray-500 mb-6">Order ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{orderId}</span></p>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/account/orders')}
                        className="w-full bg-black text-white py-3 rounded font-medium hover:bg-gray-800"
                    >
                        View My Orders
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full border border-gray-300 text-gray-700 py-3 rounded font-medium hover:bg-gray-50"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
}
