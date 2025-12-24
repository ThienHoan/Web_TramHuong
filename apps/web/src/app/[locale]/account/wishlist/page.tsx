'use client';

import { useEffect, useState } from 'react';
import { getWishlist } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';
import WishlistButton from '@/components/product/WishlistButton';
import { useCurrency } from '@/hooks/useCurrency';

export default function WishlistPage() {
    const { session, loading: authLoading } = useAuth();
    const { items: likedItems } = useWishlist();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();

    useEffect(() => {
        if (!session && !authLoading) {
            setLoading(false);
            return;
        }

        if (session) {
            getWishlist()
                .then(data => {
                    setProducts(data || []);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [session, authLoading]);

    // Live filter: Only show products that are currently in the likedItems
    // This ensures that when user clicks "Unlike" (Heart button), the item disappears immediately
    const displayedProducts = products.filter(p => likedItems.has(p.product_id));

    if (authLoading || loading) return <div className="p-12 text-center text-gray-500">Loading wishlist...</div>;

    if (!session) {
        return (
            <div className="p-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Your Wishlist</h1>
                <p className="mb-4">Please login to view your favorite products.</p>
                <Link href="/login" className="bg-black text-white px-6 py-2 rounded">Login</Link>
            </div>
        );
    }

    if (displayedProducts.length === 0) {
        return (
            <div className="p-12 text-center min-h-[50vh] flex flex-col items-center justify-center">
                <span className="text-6xl mb-4">💔</span>
                <h1 className="text-2xl font-bold mb-2">Your wishlist is empty</h1>
                <p className="text-gray-500 mb-6">Start exploring our collection and save your favorites!</p>
                <Link href="/products" className="bg-black text-white px-6 py-3 rounded hover:bg-gray-800 transition-colors">
                    Explore Products
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 min-h-screen">
            <h1 className="text-3xl font-bold mb-8">My Wishlist ({displayedProducts.length})</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displayedProducts.map((item) => (
                    <div key={item.id} className="bg-white border rounded-lg overflow-hidden group hover:shadow-lg transition-shadow">
                        <div className="aspect-square bg-gray-100 relative">
                            {item.product && (
                                <>
                                    <ProductImage src={item.product.images?.[0]} alt={item.product_title} />
                                    <div className="absolute top-2 right-2 z-10">
                                        <WishlistButton
                                            productId={item.product.id}
                                            className="bg-white/80 backdrop-blur-sm shadow-sm hover:text-red-500 text-red-500"
                                        />
                                    </div>
                                    <Link href={`/products/${item.product.slug}`} className="absolute inset-0 z-0" />
                                </>
                            )}
                        </div>
                        <div className="p-4">
                            <h3 className="font-medium truncate mb-1">
                                <Link href={`/products/${item.product?.slug}`}>{item.product_title}</Link>
                            </h3>
                            <p className="text-gray-900 font-bold">{formatPrice(Number(item.product?.price || 0))}</p>
                            <p className="text-xs text-gray-400 mt-2">Added {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
