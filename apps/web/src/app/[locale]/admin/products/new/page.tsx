'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/providers/AuthProvider';
import { Category } from '@/lib/types';
import { getCategories, setAccessToken } from '@/lib/api-client';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function NewProductPage() {
    const { session, role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form State
    const [slug, setSlug] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('0');
    const [category, setCategory] = useState('');
    const [style, setStyle] = useState('zen'); // zen or traditional
    const [titleEn, setTitleEn] = useState('');
    const [descEn, setDescEn] = useState('');
    const [titleVi, setTitleVi] = useState('');
    const [descVi, setDescVi] = useState('');
    const [images, setImages] = useState<string[]>([]); // Multiple images
    // const [isFeatured, setIsFeatured] = useState(false); // Legacy replacement
    const [featuredSection, setFeaturedSection] = useState<string>(''); // section enum

    // Discount fields
    const [discountPercentage, setDiscountPercentage] = useState('0');
    const [discountStartDate, setDiscountStartDate] = useState('');
    const [discountEndDate, setDiscountEndDate] = useState('');

    // Fetch Categories
    useEffect(() => {
        if (session) {
            setAccessToken(session.access_token);
            getCategories('en', true).then(data => {
                setCategories(data);
                if (data.length > 0) {
                    setCategory(data[0].slug);
                }
            }).catch(err => console.error('Failed to load categories', err));
        }
    }, [session]);



    // ...

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;

        // Validate at least one image
        if (images.length === 0) {
            toast.error('Please upload at least one product image');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Creating product...');

        try {
            const payload = {
                slug,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                category,
                style,
                title_en: titleEn,
                desc_en: descEn,
                title_vi: titleVi,
                desc_vi: descVi,
                images, // Array of URLs from Supabase Storage
                featured_section: featuredSection || null,
                discount_percentage: parseFloat(discountPercentage),
                discount_start_date: discountStartDate || null,
                discount_end_date: discountEndDate || null,
            };

            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success('Product created successfully', { id: toastId });
                router.push('/admin/products');
                router.refresh();
            } else {
                const err = await res.json();
                toast.error(`Error: ${err.message || 'Unknown error'}`, { id: toastId });
            }
        } catch (e: any) {
            toast.error('Failed to create product', { id: toastId });
        } finally {
            setLoading(false);
            // toast.dismiss(toastId); // success/error updates id, so no need to dismiss manually if handled
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Core Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Slug (Unique URL)</label>
                        <input required type="text" className="w-full border p-2 rounded"
                            value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. zen-bracelet-01" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                        <input required type="number" step="0.01" className="w-full border p-2 rounded"
                            value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                        <input
                            type="number"
                            placeholder="0"
                            className="w-full border p-2 rounded"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                            min="0"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Display Section (Home Page)</label>
                        <select
                            className="w-full border p-2 rounded"
                            value={featuredSection}
                            onChange={e => setFeaturedSection(e.target.value)}
                        >
                            <option value="">Standard (Default)</option>
                            <option value="chapter_1">⭐️ Chapter I: Featured / High End</option>
                            <option value="chapter_2">🌿 Chapter II: Daily Ritual</option>
                            <option value="chapter_3">🎁 Chapter III: Gift Sets</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Select where this product should appear on the homepage.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select
                            className="w-full border p-2 rounded capitalize"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select Category</option>
                            {categories.map(cat => {
                                const name = cat.translations?.find(t => t.locale === 'en')?.name || cat.slug;
                                return (
                                    <option key={cat.id} value={cat.slug}>{name}</option>
                                );
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Style</label>
                        <select className="w-full border p-2 rounded" value={style} onChange={e => setStyle(e.target.value)}>
                            <option value="zen">Zen (Minimal)</option>
                            <option value="traditional">Traditional (Vietnam)</option>
                        </select>
                    </div>
                </div>

                {/* Discount Section */}
                <div className="border-t pt-4 mt-4">
                    <h3 className="font-bold mb-3 text-sm text-gray-700 uppercase">⚡ Giảm Giá & Khuyến Mãi</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Giảm giá (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="w-full border p-2 rounded"
                                value={discountPercentage}
                                onChange={e => setDiscountPercentage(e.target.value)}
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mt-1">0-100%</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Bắt đầu (Optional)</label>
                            <input
                                type="datetime-local"
                                className="w-full border p-2 rounded"
                                value={discountStartDate}
                                onChange={e => setDiscountStartDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Kết thúc (Optional)</label>
                            <input
                                type="datetime-local"
                                className="w-full border p-2 rounded"
                                value={discountEndDate}
                                onChange={e => setDiscountEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {parseInt(discountPercentage) > 0 && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-2">📊 Preview giá bán:</p>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 line-through text-lg">
                                    {parseFloat(price || '0').toLocaleString()}₫
                                </span>
                                <span className="text-2xl font-bold text-red-600">
                                    {(parseFloat(price || '0') * (1 - parseInt(discountPercentage) / 100)).toLocaleString()}₫
                                </span>
                                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                    -{discountPercentage}%
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                                💰 Tiết kiệm: {(parseFloat(price || '0') * parseInt(discountPercentage) / 100).toLocaleString()}₫
                            </p>
                        </div>
                    )}
                </div>

                {/* English Trans */}
                <div className="border-t pt-4">
                    <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase">English Translation</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title (EN)</label>
                            <input required type="text" className="w-full border p-2 rounded"
                                value={titleEn} onChange={e => setTitleEn(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description (EN)</label>
                            <textarea className="w-full border p-2 rounded" rows={3}
                                value={descEn} onChange={e => setDescEn(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Vietnamese Trans */}
                <div className="border-t pt-4">
                    <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase">Vietnamese Translation</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Title (VI)</label>
                            <input required type="text" className="w-full border p-2 rounded"
                                value={titleVi} onChange={e => setTitleVi(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description (VI)</label>
                            <textarea className="w-full border p-2 rounded" rows={3}
                                value={descVi} onChange={e => setDescVi(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Product Images */}
                <div className="border-t pt-4">
                    <h3 className="block text-sm font-medium mb-3">Product Images</h3>
                    <ImageUploader
                        images={images}
                        onChange={setImages}
                        maxImages={5}
                        disabled={loading}
                    />
                    <p className="text-xs text-gray-500 mt-2">Upload up to 5 images. First image will be the primary product image.</p>
                </div>

                <div className="pt-4 flex gap-4">
                    <button type="submit" disabled={loading}
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50">
                        {loading ? 'Creating...' : 'Create Product'}
                    </button>
                    <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded hover:bg-gray-50">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
