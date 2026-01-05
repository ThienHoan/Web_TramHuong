'use client';

import { useState, useEffect } from 'react';
import { getReviews, createReview, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Review {
    id: string;
    rating: number;
    comment?: string;
    created_at: string;
    user?: {
        full_name?: string;
        email?: string;
        avatar_url?: string;
    };
}

interface Meta {
    total: number;
    average: number;
    distribution: Record<string, number>;
}

export default function TraditionalProductReviews({ productId }: { productId: string }) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [meta, setMeta] = useState<Meta>({ total: 0, average: 0, distribution: {} });
    const [loading, setLoading] = useState(true);
    const { user, session } = useAuth();
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const fetchReviews = async () => {
        try {
            if (session?.access_token) {
                setAccessToken(session.access_token);
            }
            const res = await getReviews(productId);
            // Ensure data safety
            setReviews(Array.isArray(res.data) ? res.data : []);
            setMeta(res.meta || { total: 0, average: 0, distribution: {} });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session?.access_token) {
            setAccessToken(session.access_token);
        }
        fetchReviews();
    }, [productId, session]);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);
        setError(null);

        try {
            await createReview(productId, rating, comment);
            setSuccess(true);
            setComment('');
            setRating(5);
            setShowForm(false);
            fetchReviews(); // Refresh list
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('already reviewed') || msg.includes('đã đánh giá')) {
                setError('Bạn đã đánh giá sản phẩm này trước đó.');
            } else {
                setError(msg || 'Có lỗi xảy ra khi gửi đánh giá.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (count: number, filledClass = "text-trad-amber-500", emptyClass = "text-gray-300") => (
        <div className="flex">
            {[...Array(5)].map((_, i) => (
                <span key={i} className={`material-symbols-outlined !text-[20px] ${i < count ? filledClass : emptyClass}`}>
                    {i < count ? 'star' : 'star_border'}
                </span>
            ))}
        </div>
    );

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    if (loading) {
        return <div className="py-12 text-center text-trad-text-muted">Đang tải đánh giá...</div>;
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-12 text-center">
                <h2 className="font-serif text-3xl font-bold text-trad-red-900 mb-4">Tiếng Lòng Hương Trầm – Chia Sẻ Từ Cộng Đồng</h2>
                <div className="w-24 h-1 bg-trad-primary mx-auto rounded-full"></div>
            </div>

            {/* Overview Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
                <div className="bg-white p-8 rounded-2xl border border-trad-border-warm shadow-sm flex flex-col items-center justify-center text-center h-full">
                    <div className="text-6xl font-black text-trad-red-900 leading-none">{meta.average ? Number(meta.average).toFixed(1) : '0.0'}</div>
                    <div className="flex text-trad-primary my-4 gap-1 transform scale-125 origin-center">
                        {renderStars(Math.round(meta.average || 0))}
                    </div>
                    <p className="text-trad-text-muted font-medium">{meta.total} đánh giá</p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-trad-border-warm shadow-sm h-full flex flex-col justify-center">
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = meta.distribution?.[star] || 0;
                        const percent = meta.total > 0 ? (count / meta.total) * 100 : 0;
                        return (
                            <div key={star} className="flex items-center gap-4 mb-3 last:mb-0">
                                <span className="text-sm font-bold w-3 text-trad-text-main">{star}</span>
                                <span className="material-symbols-outlined text-xs text-trad-primary">star</span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-trad-primary rounded-full" style={{ width: `${percent}%` }}></div>
                                </div>
                                <span className="text-xs text-trad-text-muted w-8 text-right">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mb-8 pb-8 border-b border-trad-border-warm">
                <h3 className="text-2xl font-bold text-trad-text-main">
                    {meta.total > 0 ? 'Chi tiết đánh giá' : 'Chưa có đánh giá nào'}
                </h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-trad-primary hover:bg-trad-primary-dark text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-md active:translate-y-0.5"
                >
                    <span className="material-symbols-outlined">edit</span>
                    {showForm ? 'Đóng biểu mẫu' : 'Viết đánh giá của bạn'}
                </button>
            </div>

            {/* Review Form */}
            {showForm && (
                <div className="bg-white p-8 rounded-2xl border border-trad-border-warm shadow-lg mb-12 animate-fade-in-down">
                    <h4 className="text-xl font-bold text-trad-red-900 mb-6">Chia sẻ trải nghiệm của bạn</h4>

                    {!user ? (
                        <div className="text-center py-8">
                            <p className="mb-4 text-trad-text-main">Vui lòng đăng nhập để viết đánh giá.</p>
                            <a href="/vi/login" className="inline-block text-trad-primary font-bold underline hover:text-trad-red-900">Đăng nhập ngay</a>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitReview}>
                            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-trad-text-main mb-2">Đánh giá của bạn</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <span className={`material-symbols-outlined !text-[32px] ${star <= rating ? 'text-trad-amber-500 fill-current' : 'text-gray-300'}`}>
                                                star
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-trad-text-main mb-2">Nội dung đánh giá</label>
                                <textarea
                                    className="w-full border border-trad-border-warm rounded-lg p-4 focus:ring-1 focus:ring-trad-primary focus:border-trad-primary outline-none min-h-[120px]"
                                    placeholder="Bạn cảm thấy thế nào về sản phẩm này? Hãy chia sẻ chi tiết nhé..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-trad-red-900 hover:bg-trad-red-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Success Alert */}
            {success && (
                <div className="mb-8 animate-fade-in">
                    <Alert variant="success" title="Cảm ơn bạn!">
                        Đánh giá của bạn đã được gửi thành công.
                    </Alert>
                </div>
            )}

            {/* Reviews List */}
            {meta.total === 0 && !loading ? (
                <div className="text-center py-16 bg-white border border-trad-border-warm rounded-2xl border-dashed">
                    <div className="mb-4 inline-flex p-4 rounded-full bg-trad-bg-warm text-trad-primary">
                        <span className="material-symbols-outlined !text-[48px]">rate_review</span>
                    </div>
                    <p className="text-xl font-medium text-trad-text-main mb-2">Chưa có đánh giá nào</p>
                    <p className="text-trad-text-muted">Hãy là người đầu tiên chia sẻ cảm nhận về sản phẩm này!</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 rounded-xl border border-trad-border-warm shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="shrink-0">
                                    {review.user?.avatar_url ? (
                                        <Image
                                            src={review.user.avatar_url}
                                            alt={review.user.full_name || 'User'}
                                            width={48}
                                            height={48}
                                            className="rounded-full object-cover border border-trad-border-warm"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-trad-bg-warm flex items-center justify-center text-trad-red-900 font-bold text-lg border border-trad-border-warm">
                                            {(review.user?.full_name || 'K').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-trad-text-main text-lg">{review.user?.full_name || 'Khách hàng'}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                {renderStars(review.rating, "text-trad-primary", "text-gray-200")}
                                            </div>
                                        </div>
                                        <span className="text-sm text-trad-text-muted bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                            {formatDate(review.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-trad-text-main/80 leading-relaxed text-base mt-2">
                                        {review.comment}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
