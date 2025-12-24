'use client';

import React from 'react';

interface ReviewStatsProps {
    meta: {
        total: number;
        average: number;
        distribution: Record<string, number>;
    };
}

export default function ReviewStats({ meta }: ReviewStatsProps) {
    const { total, average, distribution } = meta;

    if (total === 0) {
        return (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-500">Chưa có đánh giá nào.</p>
                <p className="text-sm text-gray-400 mt-1">Hãy là người đầu tiên đánh giá sản phẩm này!</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Big Number */}
                <div className="text-center md:w-1/3">
                    <div className="text-5xl font-bold text-gray-900 mb-2">{average}<span className="text-2xl text-gray-400">/5</span></div>
                    <div className="flex justify-center gap-1 mb-2 text-yellow-400 text-xl">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star}>{star <= Math.round(average) ? '★' : '☆'}</span>
                        ))}
                    </div>
                    <p className="text-gray-500 text-sm">Dựa trên {total} đánh giá</p>
                </div>

                {/* Bars */}
                <div className="flex-1 w-full space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = distribution[star] || 0;
                        const percent = total > 0 ? (count / total) * 100 : 0;
                        return (
                            <div key={star} className="flex items-center gap-3 text-sm">
                                <span className="w-8 font-medium text-gray-600">{star} ★</span>
                                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 rounded-full"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <span className="w-8 text-right text-gray-400">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
