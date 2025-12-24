'use client';

import React, { useEffect, useState } from 'react';
import { getReviews } from '@/lib/api-client';
import ReviewStats from './ReviewStats';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';

export default function ProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ total: 0, average: 0, distribution: {} });
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        const res = await getReviews(productId);
        setReviews(res.data || []);
        setMeta(res.meta || { total: 0, average: 0, distribution: {} });
        setLoading(false);
    };

    useEffect(() => {
        fetchReviews();
    }, [productId]);

    if (loading && reviews.length === 0) return <div className="py-8 text-center text-gray-400">Loading reviews...</div>;

    return (
        <div id="reviews" className="max-w-4xl mx-auto py-12 px-4">
            <h2 className="text-2xl font-bold mb-8 text-gray-900">Đánh giá từ khách hàng</h2>

            <ReviewStats meta={meta} />

            <ReviewList reviews={reviews} />

            <ReviewForm productId={productId} onSuccess={fetchReviews} />
        </div>
    );
}
