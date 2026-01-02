'use client';

import { useState, useEffect } from 'react';
import { useCart } from '../providers/CartProvider';
import { useCurrency } from '@/hooks/useCurrency';
import ZenFooter from './ZenFooter';
import ProductImage from '../ui/ProductImage';
import { Link, useRouter } from '@/i18n/routing';
import { getReviews, createReview, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';

export default function ZenProductDetail({ product, relatedProducts }: { product: any; relatedProducts?: any[] }) {
    const { addItem } = useCart();
    const { formatPrice } = useCurrency();
    const { session } = useAuth();
    const router = useRouter();

    const [activeImage, setActiveImage] = useState(product.images?.[0] || '');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState<'story' | 'rituals' | 'reviews'>('story');

    // Reviews state
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewStats, setReviewStats] = useState({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const reviewsPerPage = 3;

    // Review Form State
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [formRating, setFormRating] = useState(5);
    const [formComment, setFormComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (session?.access_token) {
            setAccessToken(session.access_token);
        }
    }, [session]);

    // Fetch reviews when tab is active
    const fetchReviews = () => {
        if (product.id) {
            setLoadingReviews(true);
            getReviews(product.id).then(res => {
                const data = Array.isArray(res.data) ? res.data : [];
                setReviews(data);
                setReviewStats((res.meta as any) || { average: 5, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
                setCurrentPage(1); // Reset page on fetch
            }).catch(console.error).finally(() => setLoadingReviews(false));
        }
    };

    useEffect(() => {
        if (activeTab === 'reviews') {
            fetchReviews();
        }
    }, [activeTab, product.id]);

    // Pagination Logic
    const indexOfLastReview = currentPage * reviewsPerPage;
    const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
    const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
    const totalPages = Math.ceil(reviews.length / reviewsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };



    const handleAddToCart = () => {
        addItem({
            id: product.id,
            slug: product.slug,
            title: product.translation?.title || product.title,
            price: Number(product.price),
            image: product.images?.[0] || '',
            quantity: quantity
        });

        toast.success(product.translation?.title || product.title, {
            description: `Has been added to your cart`,
            action: {
                label: 'Checkout',
                onClick: () => router.push('/checkout')
            },
            duration: 3000,
            className: 'font-manrope'
        });
    };

    const incrementQuantity = () => setQuantity(q => q + 1);
    const decrementQuantity = () => setQuantity(q => Math.max(1, q - 1));

    const handleWriteReviewClick = () => {
        if (!session) {
            if (confirm('You need to sign in to share your reflection. Proceed to login?')) {
                router.push('/login');
            }
            return;
        }
        setIsReviewFormOpen(true);
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!session) {
            setSubmitError('Session expired. Please sign in again.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await createReview(product.id, formRating, formComment);
            setIsReviewFormOpen(false);
            setFormComment('');
            setFormRating(5);
            fetchReviews(); // Refresh reviews
            alert('Your reflection has been shared.');
        } catch (err: any) {
            if (err?.message === 'Unauthorized' || err?.status === 401) {
                setSubmitError('Please sign in to share your reflection.');
            } else if (err?.message?.includes('Forbidden') || err?.message?.includes('purchase')) {
                setSubmitError('You must purchase this artifact to leave a reflection.');
            } else if (err?.message?.includes('already reviewed')) {
                setSubmitError('You have already shared your reflection for this artifact.');
            } else {
                setSubmitError(err?.message || 'Failed to submit reflection.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-zen-green-50 dark:bg-[#182111] text-zen-green-text dark:text-white font-manrope antialiased transition-colors duration-300 min-h-screen flex flex-col">

            <main className="flex-grow pt-8 pb-20">
                <div className="pt-24 flex h-full grow flex-col max-w-7xl mx-auto px-6 lg:px-8">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap items-center gap-2 py-4 mb-8 text-xs font-light tracking-wide text-zen-green-text/60 dark:text-white/60">
                        <Link className="hover:text-zen-green-primary transition-colors" href="/">Home</Link>
                        <span className="text-[10px] opacity-50">/</span>
                        <Link className="hover:text-zen-green-primary transition-colors" href="/products">Shop</Link>
                        <span className="text-[10px] opacity-50">/</span>
                        <span className="text-zen-green-text dark:text-white font-normal uppercase tracking-wider">{product.translation?.title}</span>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
                        {/* Left Column: Product Gallery */}
                        <div className="lg:col-span-7 flex flex-col gap-6 group/gallery">
                            {/* Main Image */}
                            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-zen-green-100 dark:bg-white/5">
                                <ProductImage
                                    src={activeImage}
                                    alt={product.translation?.title}
                                    className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover/gallery:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-500"></div>
                            </div>
                            {/* Thumbnails */}
                            {product.images?.length > 1 && (
                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {product.images.map((img: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveImage(img)}
                                            className={`relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border-2 transition-colors ${activeImage === img ? 'border-zen-green-primary ring-offset-2 ring-offset-zen-green-50 dark:ring-offset-[#182111]' : 'border-transparent hover:border-zen-green-200'}`}
                                        >
                                            <ProductImage src={img} alt={`Thumbnail ${idx}`} className="h-full w-full object-cover opacity-80 hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Product Details */}
                        <div className="lg:col-span-5 flex flex-col pt-4">
                            {/* Header Info */}
                            <div className="mb-2 flex items-center gap-3">
                                <span className="inline-flex items-center rounded-full bg-zen-green-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zen-green-text dark:bg-white/10 dark:text-white">
                                    {product.category?.slug === 'incense-sticks' ? 'Meditation Grade' : 'Premium Collection'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wider text-zen-green-text/60 dark:text-white/60 uppercase">
                                    <span className="material-symbols-outlined text-[14px]">eco</span>
                                    100% Natural
                                </span>
                            </div>
                            <h1 className="mb-4 text-4xl font-thin uppercase leading-tight tracking-widest text-zen-green-900 dark:text-white lg:text-5xl">
                                {product.translation?.title}
                            </h1>
                            {/* Price with discount logic */}
                            {(() => {
                                const hasDiscount = product.discount_percentage > 0;
                                const now = new Date();
                                const isActive = hasDiscount &&
                                    (!product.discount_start_date || new Date(product.discount_start_date) <= now) &&
                                    (!product.discount_end_date || new Date(product.discount_end_date) >= now);

                                if (isActive) {
                                    const finalPrice = product.price * (1 - product.discount_percentage / 100);
                                    return (
                                        <div className="mb-8 flex flex-col gap-2">
                                            <p className="text-sm font-light tracking-wide text-zen-green-text/50 dark:text-gray-500 line-through">
                                                {formatPrice(product.price)}
                                            </p>
                                            <div className="flex items-center gap-4">
                                                <p className="text-3xl font-light tracking-wide text-red-600">
                                                    {formatPrice(finalPrice)}
                                                </p>
                                                <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                                                    -{product.discount_percentage}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <p className="mb-8 text-2xl font-light tracking-wide text-zen-green-text dark:text-gray-200">
                                        {formatPrice(product.price)}
                                    </p>
                                );
                            })()}
                            <div className="mb-10 max-w-md">
                                <p className="text-sm font-light leading-loose text-zen-green-text/80 dark:text-white/80">
                                    {product.translation?.description}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="mb-12 flex flex-col gap-6 border-t border-b border-zen-green-100 dark:border-white/10 py-8">
                                {/* Quantity & Cart Row */}
                                <div className="flex items-center gap-6">
                                    <div className="flex h-12 w-32 items-center justify-between rounded-lg border border-zen-green-200 bg-zen-green-50 px-4 dark:bg-white/5 dark:border-white/10">
                                        <button onClick={decrementQuantity} className="flex h-8 w-8 items-center justify-center text-zen-green-text hover:text-zen-green-primary dark:text-white transition-colors">
                                            <span className="material-symbols-outlined text-sm">remove</span>
                                        </button>
                                        <span className="text-sm font-medium text-zen-green-900 dark:text-white">{quantity}</span>
                                        <button onClick={incrementQuantity} className="flex h-8 w-8 items-center justify-center text-zen-green-text hover:text-zen-green-primary dark:text-white transition-colors">
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={product.stock <= 0}
                                        className={`group flex h-12 flex-1 items-center justify-center gap-3 rounded-lg px-6 text-xs font-bold uppercase tracking-widest transition-all 
                                            ${product.stock > 0
                                                ? 'bg-[#182111] text-white hover:bg-zen-green-text hover:shadow-lg dark:bg-white dark:text-zen-green-900 dark:hover:bg-gray-200'
                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                    >
                                        <span>{product.stock > 0 ? 'Add to Cart' : 'Sold Out'}</span>
                                        {product.stock > 0 && <span className="material-symbols-outlined text-sm transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>}
                                    </button>
                                </div>
                                {product.stock > 0 && (
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zen-green-text/60 dark:text-white/60">
                                        <span className="h-1.5 w-1.5 rounded-full bg-zen-green-primary animate-pulse"></span>
                                        In Stock - Ready to ship
                                    </div>
                                )}
                            </div>

                            {/* Tabs Section */}
                            <div className="w-full">
                                <div className="flex border-b border-zen-green-100 dark:border-white/10 mb-8">
                                    <button
                                        onClick={() => setActiveTab('story')}
                                        className={`pb-4 px-2 text-xs font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'story' ? 'border-zen-green-primary text-zen-green-900 dark:text-white' : 'border-transparent text-zen-green-text/40 hover:text-zen-green-text dark:text-white/40 dark:hover:text-white'}`}
                                    >
                                        Story
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('rituals')}
                                        className={`pb-4 px-8 text-xs font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'rituals' ? 'border-zen-green-primary text-zen-green-900 dark:text-white' : 'border-transparent text-zen-green-text/40 hover:text-zen-green-text dark:text-white/40 dark:hover:text-white'}`}
                                    >
                                        Rituals
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('reviews')}
                                        className={`pb-4 px-8 text-xs font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === 'reviews' ? 'border-zen-green-primary text-zen-green-900 dark:text-white' : 'border-transparent text-zen-green-text/40 hover:text-zen-green-text dark:text-white/40 dark:hover:text-white'}`}
                                    >
                                        Reviews
                                    </button>
                                </div>

                                <div className="tab-content min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out">
                                    {activeTab === 'story' && (
                                        <div className="space-y-8">
                                            <p className="text-sm font-light leading-8 text-zen-green-text/80 dark:text-white/80 tracking-wide text-justify">
                                                {product.translation?.story || product.translation?.description}
                                            </p>
                                            <div className="grid grid-cols-2 gap-8 border-t border-zen-green-100 dark:border-white/10 pt-8">
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] text-zen-green-text/40 dark:text-white/40">Origin</span>
                                                    <span className="text-sm font-medium text-zen-green-900 dark:text-white tracking-wide">Khanh Hoa, Vietnam</span>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] text-zen-green-text/40 dark:text-white/40">Scent Profile</span>
                                                    <span className="text-sm font-medium text-zen-green-900 dark:text-white tracking-wide">Woody, Sweet, Earthy</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'rituals' && (
                                        <div className="space-y-12">
                                            <h3 className="text-2xl font-thin uppercase tracking-[0.15em] text-zen-green-900 dark:text-white">The Ritual of Agarwood</h3>

                                            <div className="grid grid-cols-1 gap-12">
                                                <div className="group flex gap-6 items-start">
                                                    <span className="text-4xl font-thin text-zen-green-200 dark:text-white/20">01</span>
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-zen-green-900 dark:text-white">Prepare the Space</h4>
                                                        <p className="text-sm font-light leading-relaxed text-zen-green-text/80 dark:text-white/80">
                                                            Find a quiet corner. Light the incense gently, allowing the flame to burn for a moment before blowing it out to release the sacred smoke.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="group flex gap-6 items-start">
                                                    <span className="text-4xl font-thin text-zen-green-200 dark:text-white/20">02</span>
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-zen-green-900 dark:text-white">Breathe & Center</h4>
                                                        <p className="text-sm font-light leading-relaxed text-zen-green-text/80 dark:text-white/80">
                                                            As the scent rises, close your eyes. Take deep breaths, visualizing the woody aroma grounding your spirit to the earth.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-zen-green-50 dark:bg-white/5 border border-zen-green-100 dark:border-white/10 rounded-sm">
                                                    <span className="block mb-2 text-[10px] uppercase tracking-[0.2em] text-zen-green-primary">Mindful Tip</span>
                                                    <p className="text-sm italic font-light text-zen-green-900 dark:text-white">
                                                        "The smoke of agarwood is a bridge between the earth and the heavens. Let it carry your intentions upward."
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'reviews' && (
                                        <div className="space-y-12">
                                            <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-zen-green-100 dark:border-white/10 pb-12">
                                                <div>
                                                    <h3 className="text-lg font-thin uppercase tracking-[0.2em] text-zen-green-900 dark:text-white mb-6">Customer Reflections</h3>
                                                    <div className="flex items-baseline gap-4">
                                                        <span className="text-6xl font-thin text-zen-green-900 dark:text-white tracking-tighter">
                                                            {Number(reviewStats.average).toFixed(1)}
                                                        </span>
                                                        <div className="flex flex-col">
                                                            <div className="flex text-zen-green-primary text-lg">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <span key={star} className="material-symbols-outlined fill-current text-[20px]">
                                                                        {star <= Math.round(reviewStats.average) ? 'star' : 'star_border'}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] uppercase tracking-[0.15em] text-zen-green-text/50 dark:text-white/50 mt-1">
                                                                Based on {reviewStats.total} Reviews
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="w-full md:w-1/3 space-y-2">
                                                    {[5, 4, 3, 2, 1].map((star) => {
                                                        const count = (reviewStats.distribution as any)[star] || 0;
                                                        const percent = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                                                        return (
                                                            <div key={star} className="flex items-center gap-3 text-[10px]">
                                                                <span className="w-3 text-zen-green-text/60 dark:text-white/60">{star}</span>
                                                                <div className="flex-1 h-1 bg-zen-green-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-zen-green-900 dark:bg-white" style={{ width: `${percent}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {loadingReviews ? (
                                                    <div className="text-center py-12 text-zen-green-text/40 text-xs uppercase tracking-widest animate-pulse">Loading Reflections...</div>
                                                ) : reviews.length > 0 ? (
                                                    <>
                                                        {currentReviews.map((review: any) => (
                                                            <div key={review.id} className="p-8 bg-white dark:bg-white/5 shadow-xl shadow-zen-green-100/50 dark:shadow-none rounded-sm border border-transparent hover:border-zen-green-100 transition-all">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div>
                                                                        <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-zen-green-900 dark:text-white mb-1">
                                                                            {review.user?.full_name || 'Anonymous Guest'}
                                                                        </h4>
                                                                        <span className="text-[10px] italic text-zen-green-text/40 dark:text-white/40">
                                                                            {new Date(review.created_at).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex text-zen-green-primary text-xs">
                                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                                            <span key={star} className="material-symbols-outlined text-[14px]">
                                                                                {star <= review.rating ? 'star' : 'star_border'}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm font-light leading-relaxed text-zen-green-text/80 dark:text-white/80">
                                                                    {review.comment}
                                                                </p>
                                                            </div>
                                                        ))}

                                                        {/* Pagination Controls */}
                                                        {totalPages > 1 && (
                                                            <div className="flex justify-center items-center gap-4 pt-4">
                                                                <button
                                                                    onClick={() => handlePageChange(currentPage - 1)}
                                                                    disabled={currentPage === 1}
                                                                    className={`p-2 rounded-full transition-colors ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-zen-green-900 hover:bg-zen-green-50 dark:text-white dark:hover:bg-white/10'}`}
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                                                </button>

                                                                <div className="flex gap-2">
                                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                                        <button
                                                                            key={page}
                                                                            onClick={() => handlePageChange(page)}
                                                                            className={`w-6 h-6 flex items-center justify-center text-[10px] rounded-full transition-all ${currentPage === page
                                                                                ? 'bg-zen-green-900 text-white dark:bg-white dark:text-zen-green-900 font-bold'
                                                                                : 'text-zen-green-text/60 hover:text-zen-green-900 dark:text-white/60 dark:hover:text-white'
                                                                                }`}
                                                                        >
                                                                            {page}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                <button
                                                                    onClick={() => handlePageChange(currentPage + 1)}
                                                                    disabled={currentPage === totalPages}
                                                                    className={`p-2 rounded-full transition-colors ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-zen-green-900 hover:bg-zen-green-50 dark:text-white dark:hover:bg-white/10'}`}
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-center py-12 text-zen-green-text/40 dark:text-white/40 font-light italic text-sm">
                                                        No reflections yet. Be the first to share your experience.
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-center pt-8">
                                                <button
                                                    onClick={handleWriteReviewClick}
                                                    className="inline-flex items-center gap-2 px-8 py-3 bg-[#182111] dark:bg-white text-white dark:text-[#182111] text-xs font-bold uppercase tracking-[0.2em] shadow-lg hover:bg-black dark:hover:bg-zinc-200 transition-colors"
                                                >
                                                    Write a Review
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Products Section */}
                    {relatedProducts && relatedProducts.length > 0 && (
                        <div className="mt-32 border-t border-zen-green-100 dark:border-white/10 pt-16">
                            <div className="flex items-center justify-between mb-12">
                                <h3 className="text-xl font-thin uppercase tracking-[0.2em] text-zen-green-900 dark:text-white">
                                    Other Treasures
                                </h3>
                                <Link className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zen-green-text hover:text-zen-green-primary dark:text-white transition-colors" href="/products">
                                    View All
                                    <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                                {relatedProducts.map((p) => (
                                    <Link key={p.id} href={`/products/${p.slug}`} className="group cursor-pointer">
                                        <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-md bg-zen-green-100 dark:bg-white/5">
                                            {p.images?.[0] ? (
                                                <ProductImage
                                                    src={p.images[0]}
                                                    alt={p.translation?.title || p.title}
                                                    className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-zen-green-text/30 text-xs uppercase tracking-widest">No Image</div>
                                            )}
                                            {p.is_featured && (
                                                <span className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-zen-green-900 rounded-sm">Featured</span>
                                            )}
                                            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zen-green-900 shadow-md hover:bg-zen-green-primary hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                </button>
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-normal uppercase tracking-widest text-zen-green-900 dark:text-white">{p.translation?.title || p.title}</h4>
                                        <p className="mt-1 text-xs text-zen-green-text/60 dark:text-white/60">{formatPrice(p.price)}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <ZenFooter />

            {/* Review Modal */}
            {isReviewFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zen-green-50 rounded-2xl dark:bg-[#182111] w-full max-w-lg p-8 md:p-12 shadow-2xl relative border border-zen-green-100 dark:border-white/10">
                        <button
                            onClick={() => setIsReviewFormOpen(false)}
                            className="absolute top-6 right-6 text-zen-green-text/50 hover:text-zen-green-900 dark:text-white/50 dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h3 className="text-xl font-thin uppercase tracking-[0.2em] text-center text-zen-green-900 dark:text-white mb-2">Share Your Thoughts</h3>
                        <p className="text-center text-xs text-zen-green-text/60 dark:text-white/60 mb-8 italic">How did this ritual enhance your peace?</p>

                        {submitError && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs text-center border border-red-100 dark:border-red-900/30">
                                {submitError}
                            </div>
                        )}

                        <form onSubmit={handleSubmitReview} className="space-y-8">
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setFormRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <span className={`material-symbols-outlined text-3xl ${star <= formRating ? 'fill-current text-zen-green-primary' : 'text-zen-green-200 dark:text-white/20'}`}>
                                            star
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="relative">
                                <textarea
                                    required
                                    value={formComment}
                                    onChange={(e) => setFormComment(e.target.value)}
                                    className="w-full bg-transparent border-b border-zen-green-200 dark:border-white/20 px-0 py-4 text-sm text-zen-green-900 dark:text-white focus:border-zen-green-primary focus:ring-0 placeholder:text-zen-green-text/30 dark:placeholder:text-white/30 resize-none min-h-[100px]"
                                    placeholder="Write your reflection here..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsReviewFormOpen(false)}
                                    className="flex-1 py-4 text-xs font-bold uppercase tracking-[0.2em] text-zen-green-text/60 hover:text-zen-green-900 dark:text-white/60 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-zen-green-900 text-white dark:bg-white dark:text-zen-green-900 text-xs font-bold uppercase tracking-[0.2em] hover:bg-zen-green-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
