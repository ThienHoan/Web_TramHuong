'use client';

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { session } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [slug, setSlug] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [nameVi, setNameVi] = useState('');
    const [descEn, setDescEn] = useState('');
    const [descVi, setDescVi] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (session && id) {
            fetch(`${API_URL}/categories/${id}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            })
                .then(res => res.json())
                .then(data => {
                    setSlug(data.slug);
                    setIsActive(data.is_active);

                    const en = data.translations.find((t: any) => t.locale === 'en');
                    const vi = data.translations.find((t: any) => t.locale === 'vi');

                    if (en) {
                        setNameEn(en.name);
                        setDescEn(en.description || '');
                    }
                    if (vi) {
                        setNameVi(vi.name);
                        setDescVi(vi.description || '');
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    alert('Failed to load category');
                });
        }
    }, [id, session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/categories/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    slug,
                    name_en: nameEn,
                    name_vi: nameVi,
                    description_en: descEn,
                    description_vi: descVi,
                    is_active: isActive
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to update category');
            }

            router.push('/admin/categories');
            router.refresh();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading Category...</div>;

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Edit Category</h1>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">Slug (URL identifier)</label>
                        <input
                            type="text"
                            required
                            value={slug}
                            onChange={e => setSlug(e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>
                    <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="w-5 h-5"
                            />
                            <span className="text-sm font-medium">Active</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name (English)</label>
                        <input
                            type="text"
                            required
                            value={nameEn}
                            onChange={e => setNameEn(e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Name (Vietnamese)</label>
                        <input
                            type="text"
                            required
                            value={nameVi}
                            onChange={e => setNameVi(e.target.value)}
                            className="w-full border rounded p-2"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Description (English)</label>
                        <textarea
                            value={descEn}
                            onChange={e => setDescEn(e.target.value)}
                            className="w-full border rounded p-2"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description (Vietnamese)</label>
                        <textarea
                            value={descVi}
                            onChange={e => setDescVi(e.target.value)}
                            className="w-full border rounded p-2"
                            rows={3}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50"
                >
                    {submitting ? 'Updating...' : 'Update Category'}
                </button>
            </form>
        </div>
    );
}
