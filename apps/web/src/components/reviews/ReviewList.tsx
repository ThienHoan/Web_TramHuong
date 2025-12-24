'use client';

import React from 'react';

interface ReviewListProps {
    reviews: any[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
    if (reviews.length === 0) return null;

    return (
        <div className="space-y-6 mt-8">
            {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold overflow-hidden">
                                {review.user?.avatar_url ? (
                                    <img src={review.user.avatar_url} alt={review.user.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    (review.user?.full_name || 'U')[0].toUpperCase()
                                )}
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-900 text-sm">
                                    {review.user?.full_name || 'Khách hàng ẩn danh'}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <div className="text-yellow-400 text-sm">
                                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                    </div>
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium border border-green-100">
                                        Verified Purchase
                                    </span>
                                </div>
                            </div>
                        </div>
                        <time className="text-xs text-gray-400">
                            {new Date(review.created_at).toLocaleDateString('vi-VN')}
                        </time>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed pl-[52px]">
                        {review.comment}
                    </p>
                </div>
            ))}
        </div>
    );
}
