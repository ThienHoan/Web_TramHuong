'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminProductsPage() {
    const { session, role, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (role !== 'ADMIN' && role !== 'STAFF') {
                router.push('/');
                return;
            }

            if (session) {
                fetch(`${API_URL}/products?include_inactive=true`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                    cache: 'no-store'
                })
                    .then(res => res.json())
                    .then(data => {
                        setProducts(data);
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error(err);
                        setLoading(false);
                    });
            }
        }
    }, [authLoading, role, session, router]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete (archive) this product?')) return;
        if (!session) return;

        try {
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: false } : p));
            } else {
                alert('Failed to delete product');
            }
        } catch (e) {
            alert('Error deleting product');
        }
    };

    const handleRestore = async (id: string) => {
        if (!confirm('Activate this product again?')) return;
        if (!session) return;

        try {
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: true })
            });
            if (res.ok) {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: true } : p));
            } else {
                alert('Failed to restore product');
            }
        } catch (e) {
            alert('Error restoring product');
        }
    };

    if (loading) return <div>Loading Products...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Product Management</h1>
                <Link
                    href="/admin/products/new"
                    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 text-sm"
                >
                    + Add New Product
                </Link>
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="p-4 w-20">Image</th>
                            <th className="p-4">Name (EN/VI)</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.map(product => {
                            const transEn = product.translations?.find((t: any) => t.locale === 'en');
                            const transVi = product.translations?.find((t: any) => t.locale === 'vi');

                            return (
                                <tr key={product.id} className={!product.is_active ? 'bg-gray-50 opacity-60' : ''}>
                                    <td className="p-4">
                                        <div className="w-12 h-12 relative bg-gray-200 rounded overflow-hidden">
                                            <ProductImage
                                                src={product.images?.[0] || product.image}
                                                alt={product.slug}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium">{transEn?.title || product.slug}</div>
                                        <div className="text-xs text-gray-500">{transVi?.title || '---'}</div>
                                    </td>
                                    <td className="p-4 font-mono">${product.price}</td>
                                    <td className="p-4 text-sm capitalize">{product.category}</td>
                                    <td className="p-4">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {product.is_active ? 'ACTIVE' : 'ARCHIVED'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <Link
                                            href={`/admin/products/${product.id}`}
                                            className="text-blue-600 hover:underline text-sm"
                                        >
                                            Edit
                                        </Link>
                                        {product.is_active ? (
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="text-red-600 hover:underline text-sm"
                                            >
                                                Delete
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRestore(product.id)}
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
                {products.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No products found.</div>
                )}
            </div>
        </div>
    );
}
