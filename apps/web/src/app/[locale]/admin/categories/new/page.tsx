'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from '@/i18n/routing';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function NewCategoryPage() {
    const { session } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [slug, setSlug] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [nameVi, setNameVi] = useState('');
    const [descEn, setDescEn] = useState('');
    const [descVi, setDescVi] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
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
                    is_active: true
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to create category');
            }

            router.push('/admin/categories');
            router.refresh();
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6">Create New Category</h1>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">

                <div>
                    <label className="block text-sm font-medium mb-1">Slug (URL identifier)</label>
                    <input
                        type="text"
                        required
                        value={slug}
                        onChange={e => setSlug(e.target.value)}
                        className="w-full border rounded p-2"
                        placeholder="e.g. agarwood-incense"
                    />
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
                    {submitting ? 'Creating...' : 'Create Category'}
                </button>
            </form>
        </div>
    );
}
