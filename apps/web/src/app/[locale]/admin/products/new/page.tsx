'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/providers/AuthProvider';
import { Category } from '@/lib/types';

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
    const [image, setImage] = useState<File | null>(null);

    // Fetch Categories
    useEffect(() => {
        if (session) {
            fetch(`${API_URL}/categories`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
                .then(res => res.json())
                .then(data => {
                    setCategories(data);
                    if (data.length > 0) {
                        setCategory(data[0].slug);
                    }
                })
                .catch(err => console.error('Failed to load categories', err));
        }
    }, [session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('slug', slug);
            formData.append('price', price);
            formData.append('quantity', quantity);
            formData.append('category', category);
            formData.append('style', style);
            formData.append('title_en', titleEn);
            formData.append('desc_en', descEn);
            formData.append('title_vi', titleVi);
            formData.append('desc_vi', descVi);
            if (image) {
                formData.append('image', image);
            }

            const res = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                    // Content-Type is auto-set for FormData
                },
                body: formData
            });

            if (res.ok) {
                router.push('/admin/products');
                router.refresh();
            } else {
                const err = await res.json();
                alert(`Error: ${err.message || 'Unknown error'}`);
            }
        } catch (e: any) {
            alert('Failed to create product');
        } finally {
            setLoading(false);
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
                    <input required type="file" accept="image/*"
                        onChange={e => setImage(e.target.files?.[0] || null)}
                        className="w-full border p-2 rounded bg-gray-50" />
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
