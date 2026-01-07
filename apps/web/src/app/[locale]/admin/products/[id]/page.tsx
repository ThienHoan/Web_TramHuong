'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from '@/i18n/routing';
import { getCategories, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import ProductImage from '@/components/ui/ProductImage';
import { Category } from '@/lib/types';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // Force refresh
    const { session, role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Form State
    const [slug, setSlug] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [category, setCategory] = useState('');
    const [style, setStyle] = useState('both');
    const [quantity, setQuantity] = useState('0');
    const [titleEn, setTitleEn] = useState('');
    const [descEn, setDescEn] = useState('');
    const [titleVi, setTitleVi] = useState('');
    const [descVi, setDescVi] = useState('');
    const [currentImages, setCurrentImages] = useState<string[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [variants, setVariants] = useState<{ name: string; price: number | null; original_price?: number | null; description: string }[]>([]);
    const [specsEn, setSpecsEn] = useState<{ key: string; value: string }[]>([]);
    const [specsVi, setSpecsVi] = useState<{ key: string; value: string }[]>([]);
    // const [isFeatured, setIsFeatured] = useState(false);
    const [featuredSection, setFeaturedSection] = useState<string>('');

    // Discount fields
    const [discountPercentage, setDiscountPercentage] = useState('0');
    const [discountStartDate, setDiscountStartDate] = useState('');
    const [discountEndDate, setDiscountEndDate] = useState('');

    useEffect(() => {
        if (!session) return;

        // Fetch Categories first
        // Fetch Categories first
        if (session.access_token) {
            setAccessToken(session.access_token);
            getCategories('en', true).then(data => setCategories(data));
        }

        // Fetch Product
        fetch(`${API_URL}/products/admin/${id}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            cache: 'no-store'
        })
            .then(res => res.json())
            .then(data => {
                setSlug(data.slug);
                setPrice(data.price.toString());
                setOriginalPrice(data.original_price?.toString() || '');
                setQuantity(data.quantity?.toString() || '0');
                const catSlug = (data.category && typeof data.category === 'object') ? data.category.slug : data.category;
                setCategory(catSlug || (categories.length > 0 ? categories[0].slug : ''));
                setStyle(data.style_affinity || 'both');
                // setIsFeatured(!!data.is_featured);
                setFeaturedSection(data.featured_section || (data.is_featured ? 'chapter_1' : ''));

                // Support images array primarily
                const imgs = data.images && data.images.length > 0 ? data.images : (data.image ? [data.image] : []);
                setCurrentImages(imgs);

                const tEn = data.translations?.find((t: any) => t.locale === 'en');
                const tVi = data.translations?.find((t: any) => t.locale === 'vi');

                setTitleEn(tEn?.title || '');
                setDescEn(tEn?.description || '');
                setTitleVi(tVi?.title || '');
                setDescVi(tVi?.description || '');

                const parseSpecs = (raw: any) => {
                    if (!raw) return [];
                    if (typeof raw === 'object') return Object.entries(raw).map(([key, value]) => ({ key, value: String(value) }));
                    if (typeof raw === 'string') {
                        try { return Object.entries(JSON.parse(raw)).map(([key, value]) => ({ key, value: String(value) })); } catch { }
                        return raw.split('. ').map((s: string) => {
                            const [k, v] = s.split(':');
                            return { key: k?.trim() || '', value: v?.trim() || '' };
                        }).filter((x: any) => x.key);
                    }
                    return [];
                };
                setSpecsEn(parseSpecs(tEn?.specifications));
                setSpecsVi(parseSpecs(tVi?.specifications));
                setVariants(Array.isArray(data.variants) ? data.variants : []);

                // Load discount data
                setDiscountPercentage(data.discount_percentage?.toString() || '0');
                // Convert DB timestamp to datetime-local format
                if (data.discount_start_date) {
                    const start = new Date(data.discount_start_date);
                    setDiscountStartDate(start.toISOString().slice(0, 16));
                }
                if (data.discount_end_date) {
                    const end = new Date(data.discount_end_date);
                    setDiscountEndDate(end.toISOString().slice(0, 16));
                }

                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load product');
                router.push('/admin/products');
            });

    }, [id, session, router]);



    // ...

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setSubmitting(true);
        const toastId = toast.loading('Updating product...');

        try {
            const formData = new FormData();
            formData.append('slug', slug);
            formData.append('price', price);
            formData.append('original_price', originalPrice);
            formData.append('quantity', quantity);
            formData.append('category', category);
            formData.append('style', style);
            formData.append('title_en', titleEn);
            formData.append('desc_en', descEn);
            formData.append('title_vi', titleVi);
            formData.append('desc_vi', descVi);
            // formData.append('is_featured', String(isFeatured));
            formData.append('featured_section', featuredSection || '');

            formData.append('variants', JSON.stringify(variants));

            const specsEnObj = specsEn.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
            const specsViObj = specsVi.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
            formData.append('specifications_en', JSON.stringify(specsEnObj));
            formData.append('specifications_vi', JSON.stringify(specsViObj));

            // Discount fields
            formData.append('discount_percentage', discountPercentage);
            if (discountStartDate) formData.append('discount_start_date', discountStartDate);
            if (discountEndDate) formData.append('discount_end_date', discountEndDate);

            formData.append('keep_images', JSON.stringify(currentImages));
            newFiles.forEach(f => formData.append('files', f));

            // Note: Patch request in NestJS with FileInterceptor requires Multipart
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                    // No Content-Type header for FormData, browser sets it with boundary
                },
                body: formData
            });

            if (res.ok) {
                toast.success('Product updated successfully', { id: toastId });
                router.push('/admin/products');
                router.refresh();
            } else {
                const err = await res.json();
                toast.error(`Error: ${err.message || 'Unknown error'}`, { id: toastId });
            }
        } catch (e: any) {
            toast.error('Failed to update product', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold mb-6">Edit Product</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Core Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Slug</label>
                        <input required type="text" className="w-full border p-2 rounded"
                            value={slug} onChange={e => setSlug(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                        <div className="flex gap-2">
                            <input required type="number" step="0.01" className="w-1/2 border p-2 rounded" placeholder="Sale Price"
                                value={price} onChange={e => setPrice(e.target.value)} />
                            <input type="number" step="0.01" className="w-1/2 border p-2 rounded" placeholder="Orig. Price (Optional)"
                                value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} />
                        </div>
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
                            <option value="both">Both</option>
                        </select>
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

                {/* Image */}
                {/* Images */}
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-3">Product Images</label>

                    {/* Current Images */}
                    {currentImages.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">Current Images (First is Main)</p>
                            <div className="flex flex-wrap gap-4">
                                {currentImages.map((img, idx) => (
                                    <div key={img} className="relative group w-24 h-24 border rounded overflow-hidden">
                                        <ProductImage src={img} alt={`Img ${idx}`} />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {/* Set Main */}
                                            {idx !== 0 && (
                                                <button type="button" onClick={() => {
                                                    const newOrder = [img, ...currentImages.filter(i => i !== img)];
                                                    setCurrentImages(newOrder);
                                                }} className="text-white hover:text-yellow-400" title="Set as Main">
                                                    <span className="material-symbols-outlined">star</span>
                                                </button>
                                            )}
                                            {idx === 0 && <span className="material-symbols-outlined text-yellow-400">star</span>}
                                            {/* Delete */}
                                            <button type="button" onClick={() => setCurrentImages(currentImages.filter(i => i !== img))}
                                                className="text-white hover:text-red-400" title="Remove">
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Files */}
                    <div className="mb-2">
                        <input type="file" accept="image/*" multiple
                            onChange={e => {
                                if (e.target.files) {
                                    setNewFiles([...newFiles, ...Array.from(e.target.files)]);
                                }
                            }}
                            className="w-full border p-2 rounded bg-gray-50" />
                    </div>
                    {newFiles.length > 0 && (
                        <div className="flex flex-wrap gap-4">
                            {newFiles.map((file, idx) => (
                                <div key={idx} className="relative w-20 h-20 border rounded overflow-hidden">
                                    <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setNewFiles(newFiles.filter((_, i) => i !== idx))}
                                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl">
                                        <span className="material-symbols-outlined text-xs">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* VARIANTS EDITOR */}
                <div className="border-t pt-4">
                    <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase flex justify-between items-center">
                        Variants & Options
                        <button type="button" onClick={() => setVariants([...variants, { name: '', price: 0, description: '' }])}
                            className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">+ Add Variant</button>
                    </h3>
                    <div className="space-y-2">
                        {variants.map((v, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <input type="text" placeholder="Name (e.g. 30cm)" className="flex-1 border p-2 rounded text-sm"
                                    value={v.name} onChange={e => {
                                        const newV = [...variants]; newV[idx].name = e.target.value; setVariants(newV);
                                    }} />
                                <input type="number" placeholder="Price (Empty = Base)" className="w-24 border p-2 rounded text-sm"
                                    value={v.price ?? ''} onChange={e => {
                                        const val = e.target.value;
                                        const newV = [...variants];
                                        newV[idx].price = val === '' ? null : Number(val);
                                        setVariants(newV);
                                    }} />
                                <input type="number" placeholder="Orig. Price" className="w-24 border p-2 rounded text-sm"
                                    value={v.original_price ?? ''} onChange={e => {
                                        const val = e.target.value;
                                        const newV = [...variants];
                                        newV[idx].original_price = val === '' ? null : Number(val);
                                        setVariants(newV);
                                    }} />
                                <input type="text" placeholder="Desc/Short" className="flex-1 border p-2 rounded text-sm"
                                    value={v.description} onChange={e => {
                                        const newV = [...variants]; newV[idx].description = e.target.value; setVariants(newV);
                                    }} />
                                <button type="button" onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))}
                        {variants.length === 0 && <p className="text-sm text-gray-400 italic">No variants defined.</p>}
                    </div>
                </div>

                {/* SPECIFICATIONS EDITOR */}
                <div className="border-t pt-4 grid grid-cols-2 gap-8">
                    {/* Specs EN */}
                    <div>
                        <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase flex justify-between items-center">
                            Specs (English)
                            <button type="button" onClick={() => setSpecsEn([...specsEn, { key: '', value: '' }])}
                                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">+ Add</button>
                        </h3>
                        <div className="space-y-2">
                            {specsEn.map((s, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input type="text" placeholder="Key" className="w-1/3 border p-1 rounded text-sm"
                                        value={s.key} onChange={e => { const n = [...specsEn]; n[idx].key = e.target.value; setSpecsEn(n); }} />
                                    <input type="text" placeholder="Value" className="flex-1 border p-1 rounded text-sm"
                                        value={s.value} onChange={e => { const n = [...specsEn]; n[idx].value = e.target.value; setSpecsEn(n); }} />
                                    <button type="button" onClick={() => setSpecsEn(specsEn.filter((_, i) => i !== idx))} className="text-red-500">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Specs VI */}
                    <div>
                        <h3 className="font-bold mb-3 text-sm text-gray-500 uppercase flex justify-between items-center">
                            Specs (Vietnamese)
                            <button type="button" onClick={() => setSpecsVi([...specsVi, { key: '', value: '' }])}
                                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">+ Add</button>
                        </h3>
                        <div className="space-y-2">
                            {specsVi.map((s, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input type="text" placeholder="Key" className="w-1/3 border p-1 rounded text-sm"
                                        value={s.key} onChange={e => { const n = [...specsVi]; n[idx].key = e.target.value; setSpecsVi(n); }} />
                                    <input type="text" placeholder="Value" className="flex-1 border p-1 rounded text-sm"
                                        value={s.value} onChange={e => { const n = [...specsVi]; n[idx].value = e.target.value; setSpecsVi(n); }} />
                                    <button type="button" onClick={() => setSpecsVi(specsVi.filter((_, i) => i !== idx))} className="text-red-500">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex gap-4">
                    <button type="submit" disabled={submitting}
                        className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50">
                        {submitting ? 'Updating...' : 'Update Product'}
                    </button>
                    <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded hover:bg-gray-50">
                        Cancel
                    </button>
                </div>
            </form >

            {/* SEED REVIEW SECTION */}
            < div className="mt-12 border-t pt-8" >
                <h2 className="text-xl font-bold mb-6 text-gray-800">Seed Fake Review (Buffing)</h2>
                <SeedReviewForm productId={id} />
            </div >
        </div >
    );
}

function SeedReviewForm({ productId }: { productId: string }) {
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const { session } = useAuth();
    const router = useRouter();

    const handleSeed = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (session?.access_token) setAccessToken(session.access_token);

        try {
            const { seedReview } = await import('@/lib/api-client');
            // Use provided URL or generate one
            const finalAvatar = avatarUrl.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

            await seedReview({
                productId,
                rating,
                comment,
                reviewerName: name,
                reviewerAvatar: finalAvatar
            });
            alert('Review seeded successfully!');
            setName('');
            setAvatarUrl('');
            setComment('');
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSeed} className="bg-gray-50 p-6 rounded border border-gray-200">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Reviewer Name</label>
                    <input required type="text" className="w-full border p-2 rounded"
                        placeholder="e.g. Nguyen Van A"
                        value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Rating</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button type="button" key={star} onClick={() => setRating(star)}
                                className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
                                ★
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Avatar URL (Optional)</label>
                <input type="url" className="w-full border p-2 rounded"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from name.</p>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Comment</label>
                <textarea required className="w-full border p-2 rounded" rows={2}
                    placeholder="Very good product..."
                    value={comment} onChange={e => setComment(e.target.value)} />
            </div>
            <button type="submit" disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 w-full">
                {loading ? 'Seeding...' : 'Add Fake Review'}
            </button>
        </form>
    );
}
