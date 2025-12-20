'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/providers/AuthProvider';
import ProductImage from '@/components/ui/ProductImage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { session, role } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [slug, setSlug] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('bracelet');
    const [style, setStyle] = useState('zen');
    const [titleEn, setTitleEn] = useState('');
    const [descEn, setDescEn] = useState('');
    const [titleVi, setTitleVi] = useState('');
    const [descVi, setDescVi] = useState('');
    const [currentImage, setCurrentImage] = useState('');
    const [newImage, setNewImage] = useState<File | null>(null);

    useEffect(() => {
        if (!session) return;

        fetch(`${API_URL}/products/admin/${id}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
            .then(res => res.json())
            .then(data => {
                setSlug(data.slug);
                setPrice(data.price.toString());
                setCategory(data.category);
                setStyle(data.style || 'zen');
                // Support images array primarily
                const img = data.images && data.images.length > 0 ? data.images[0] : data.image;
                setCurrentImage(img || '');

                const tEn = data.translations?.find((t: any) => t.locale === 'en');
                const tVi = data.translations?.find((t: any) => t.locale === 'vi');

                setTitleEn(tEn?.title || '');
                setDescEn(tEn?.description || '');
                setTitleVi(tVi?.title || '');
                setDescVi(tVi?.description || '');

                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load product');
                router.push('/admin/products');
            });

    }, [id, session, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setSubmitting(true);

        try {
            // Check if using FormData or JSON
            // Since controller expects Multipart if file is present, or maybe JSON if not?
            // Usually simpler to always use FormData for this endpoint if it supports it, 
            // but our backend update logic might handle it.
            // Let's inspect backend: It uses FileInterceptor.
            // If we don't send a file, we can still send fields.

            const formData = new FormData();
            formData.append('slug', slug);
            formData.append('price', price);
            formData.append('category', category);
            formData.append('style', style);
            formData.append('title_en', titleEn);
            formData.append('desc_en', descEn);
            formData.append('title_vi', titleVi);
            formData.append('desc_vi', descVi);

            if (newImage) {
                formData.append('image', newImage);
            }

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
                alert('Product updated successfully');
                router.push('/admin/products');
                router.refresh();
            } else {
                const err = await res.json();
                alert(`Error: ${err.message || 'Unknown error'}`);
            }
        } catch (e: any) {
            alert('Failed to update product');
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
                        <input required type="number" step="0.01" className="w-full border p-2 rounded"
                            value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <select className="w-full border p-2 rounded" value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="bracelet">Bracelet</option>
                            <option value="incense">Incense</option>
                            <option value="oil">Essential Oil</option>
                            <option value="statue">Statue</option>
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

                {/* Image */}
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-1">Product Image</label>
                    <div className="flex items-center gap-4 mb-2">
                        {currentImage && (
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                                <ProductImage src={currentImage} alt="Current" />
                            </div>
                        )}
                        <div className="text-xs text-gray-500">Current Image</div>
                    </div>
                    <input type="file" accept="image/*"
                        onChange={e => setNewImage(e.target.files?.[0] || null)}
                        className="w-full border p-2 rounded bg-gray-50" />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to keep current image</p>
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
            </form>
        </div>
    );
}
