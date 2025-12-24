'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getMyReviews, setAccessToken } from '@/lib/api-client';
import ProductImage from '@/components/ui/ProductImage';
import { useRouter } from '@/i18n/routing';
import { Link } from '@/i18n/routing';

export default function MyReviewsPage() {
    const { session } = useAuth();
    const router = useRouter();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) {
            router.push('/login');
            return;
        }

        setAccessToken(session.access_token);
        getMyReviews()
            .then(data => {
                setReviews(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [session, router]);

    if (loading) return <div className="p-8 text-center">Loading reviews...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">My Reviews</h1>

            {reviews.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded">
                    <p className="text-gray-500 mb-4">You haven't reviewed any products yet.</p>
                    <Link href="/products" className="text-black underline font-medium">Start Shopping</Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 rounded-lg shadow-sm border flex gap-6">
                            {/* Product Image */}
                            <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded overflow-hidden relative">
                                {review.product && (
                                    <ProductImage
                                        src={review.product.images?.[0] || review.product.image}
                                        alt={review.product_title}
                                    />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg">
                                        <Link href={`/products/${review.product?.slug}`} className="hover:underline">
                                            {review.product_title || 'Unknown Product'}
                                        </Link>
                                    </h3>
                                    <span className="text-sm text-gray-500">
                                        {new Date(review.created_at).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <span key={star} className={`text-xl ${star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                    ))}
                                </div>

                                <p className="text-gray-700">{review.comment}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
