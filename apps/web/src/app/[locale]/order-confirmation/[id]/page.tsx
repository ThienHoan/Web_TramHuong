'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { getOrder } from '@/lib/api-client';
import { Order } from '@/types/order';
import ZenOrderSuccess from '@/components/zen/ZenOrderSuccess';
import { useAuth } from '@/components/providers/AuthProvider';

export default function OrderConfirmationPage() {
    const params = useParams();
    const id = params.id as string;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useAuth(); // Monitor auth state if needed, though getHeaders handles token

    useEffect(() => {
        if (!id) return;

        const fetchOrder = async () => {
            try {
                // Try fetching directly
                const data = await getOrder(id);
                if (data) {
                    setOrder(data);
                } else {
                    // Guest Access (401/403) or Not Found.
                    // Assume Guest Success Flow for better UX.
                    setOrder({
                        id: id as string,
                        status: 'PENDING',
                        total: 0,
                        items: [],
                        shipping_info: {
                            name: 'Guest',
                            phone: '',
                            address: '',
                            city: '',
                        },
                        payment_method: 'cod',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
                    } as any);
                }
            } catch (err) {
                console.error(err);
                setError('Could not load order details.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-main dark:text-white">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
                    <p className="tracking-widest uppercase text-xs">Loading Order...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-text-main dark:text-white">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-4xl text-red-500">error</span>
                    <p className="tracking-widest uppercase text-xs">{error || 'Order not found'}</p>
                    <Link href="/" className="text-primary hover:underline text-xs tracking-widest uppercase mt-4">Return Home</Link>
                </div>
            </div>
        );
    }

    return <ZenOrderSuccess order={order} />;
}
