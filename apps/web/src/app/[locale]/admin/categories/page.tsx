'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import { Category } from '@/lib/types';
import Pagination from '@/components/ui/Pagination';
import { ADMIN_PAGE_LIMIT } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminCategoriesPage() {
    const { session, role, loading: authLoading } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: ADMIN_PAGE_LIMIT, last_page: 1 });
    const router = useRouter();

    const fetchCategories = (page = 1) => {
        if (!session) return;
        setLoading(true);
        fetch(`${API_URL}/categories?include_inactive=true&page=${page}&limit=${ADMIN_PAGE_LIMIT}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            cache: 'no-store'
        })
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setCategories(data.data);
                    setMeta(data.meta);
                } else {
                    setCategories([]); // Fallback
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (!authLoading) {
            if (role !== 'ADMIN' && role !== 'STAFF') {
                router.push('/');
                return;
            }

            if (session) {
                fetchCategories(1);
            }
        }
    }, [authLoading, role, session, router]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate (soft delete) this category?')) return;
        if (!session) return;

        try {
            const res = await fetch(`${API_URL}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: false } : c));
            } else {
                alert('Failed to delete category');
            }
        } catch (e) {
            alert('Error deleting category');
        }
    };

    const handleRestore = async (id: string) => {
        if (!confirm('Activate this category again?')) return;
        if (!session) return;

        try {
            const res = await fetch(`${API_URL}/categories/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: true })
            });
            if (res.ok) {
                setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: true } : c));
            } else {
                alert('Failed to restore category');
            }
        } catch (e) {
            alert('Error restoring category');
        }
    };

    if (loading) return <div>Loading Categories...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Category Management</h1>
                <Link
                    href="/admin/categories/new"
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 text-sm"
                >
                    + Add New Category
                </Link>
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-4">Name (EN/VI)</th>
                            <th className="p-4">Slug</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {categories.map(category => {
                            const transEn = category.translations?.find((t) => t.locale === 'en');
                            const transVi = category.translations?.find((t) => t.locale === 'vi');

                            return (
                                <tr key={category.id} className={!category.is_active ? 'bg-gray-50 opacity-60' : ''}>
                                    <td className="p-4">
                                        <div className="font-medium">{transEn?.name || category.slug}</div>
                                        <div className="text-xs text-gray-500">{transVi?.name || '---'}</div>
                                    </td>
                                    <td className="p-4 text-sm font-mono">{category.slug}</td>
                                    <td className="p-4">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <Link
                                            href={`/admin/categories/${category.id}`}
                                            className="text-blue-600 hover:underline text-sm"
                                        >
                                            Edit
                                        </Link>
                                        {category.is_active ? (
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="text-red-600 hover:underline text-sm"
                                            >
                                                Deactivate
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRestore(category.id)}
                                                className="text-green-600 hover:underline text-sm"
                                            >
                                                Restore
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {categories.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No categories found.</div>
                )}

                <div className="bg-white border-t border-gray-100">
                    <Pagination
                        meta={meta}
                        onPageChange={(page) => fetchCategories(page)}
                    />
                </div>
            </div>
        </div>
    );
}
