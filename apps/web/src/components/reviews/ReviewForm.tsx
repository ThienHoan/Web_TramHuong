'use client';

import React, { useState } from 'react';
import { createReview } from '@/lib/api-client';

interface ReviewFormProps {
    productId: string;
    onSuccess: () => void;
}

export default function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await createReview(productId, rating, comment);
            setComment('');
            setRating(5);
            onSuccess();
        } catch (err: any) {
            // Check for verified purchase error
            if (err.message.includes('Forbidden') || err.message.includes('purchase')) {
                setError('Bạn cần mua và thanh toán sản phẩm này mới được viết đánh giá.');
            } else if (err.message.includes('already reviewed')) {
                setError('Bạn đã đánh giá sản phẩm này rồi.');
            } else {
                setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Viết đánh giá của bạn</h3>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Đánh giá sao</label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className={`text-2xl focus:outline-none transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                        >
                            ★
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung</label>
                <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-stone-500 focus:outline-none bg-white min-h-[100px]"
                    placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 disabled:opacity-50 transition-colors"
            >
                {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
        </form>
    );
}
