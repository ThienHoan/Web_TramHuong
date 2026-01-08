'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getReviews, setAccessToken } from '@/lib/api-client';
import ReviewStats from './ReviewStats';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';
import { useAuth } from '@/components/providers/AuthProvider';

export default function ReviewsSection({ productId }: { productId: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
    const [reviews, setReviews] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix type
    const [meta, setMeta] = useState<any>({ total: 0, average: 0, distribution: {} });
    const [loading, setLoading] = useState(true);
    const { session } = useAuth();

    useEffect(() => {
        if (session?.access_token) {
            setAccessToken(session.access_token);
        }
    }, [session]);

    const fetchReviews = useCallback(async () => {
        try {
            const res = await getReviews(productId);
            // Ensure data is array and cast to any to satisfy the state type
            const safeData = Array.isArray(res.data) ? res.data : [];
            setReviews(safeData);
            setMeta(res.meta || { total: 0, average: 0, distribution: {} });
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchReviews();
    }, [productId, fetchReviews]);

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
