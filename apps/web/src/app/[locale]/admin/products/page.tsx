'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import ProductImage from '@/components/ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import Pagination from '@/components/ui/Pagination';
import { ADMIN_PAGE_LIMIT } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminProductsPage() {
    const { session, role, loading: authLoading } = useAuth();
    const { formatPrice } = useCurrency();
    const router = useRouter();

    // State
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: ADMIN_PAGE_LIMIT, last_page: 1 });
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [exporting, setExporting] = useState(false);

    // Filter State
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('all'); // all, active, archived
    const [sort, setSort] = useState('created_at:desc');

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch Categories
    useEffect(() => {
        if (session) {
            fetch(`${API_URL}/categories?locale=en`)
                .then(res => res.json())
                .then(data => setCategories(Array.isArray(data) ? data : []))
                .catch(err => console.error('Failed to load categories', err));
        }
    }, [session]);

    const fetchProducts = useCallback(async (page = 1) => {
        if (!session) return;
        setLoading(true);
        setSelectedIds([]); // Clear selection on fetch

        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', ADMIN_PAGE_LIMIT.toString());
        params.append('locale', 'en');
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (category) params.append('category', category);
        if (sort) params.append('sort', sort);

        if (status === 'archived') {
            params.append('include_inactive', 'true');
        } else if (status === 'all') {
            params.append('include_inactive', 'true');
        }

        try {
            const res = await fetch(`${API_URL}/products?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                cache: 'no-store'
            });
            const data = await res.json();

            if (data.data) {
                setProducts(data.data);
                setMeta(data.meta);
            } else {
                setProducts(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [session, debouncedSearch, category, sort, status]);

    useEffect(() => {
        if (!authLoading) {
            if (role !== 'ADMIN' && role !== 'STAFF') {
                router.push('/');
                return;
            }
            fetchProducts(1);
        }
    }, [authLoading, role, router, fetchProducts]);

    // --- Bulk Selection Handlers ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(products.map(p => p.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    // --- Bulk Actions ---
    const handleBulkAction = async (action: 'archive' | 'restore' | 'delete') => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to ${action} ${selectedIds.length} items?`)) return;

        try {
            const res = await fetch(`${API_URL}/products/bulk/update`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ ids: selectedIds, action })
            });

            if (res.ok) {
                alert('Bulk action successful');
                fetchProducts(meta.page);
            } else {
                alert('Bulk action failed');
            }
        } catch (e) {
            console.error(e);
            alert('Error executing bulk action');
        }
    };

    // --- Export ---
    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            params.append('locale', 'en');
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (category) params.append('category', category);
            if (status !== 'active') params.append('include_inactive', 'true');

            const res = await fetch(`${API_URL}/products/data/export?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            const data = await res.json();
            if (data.csv) {
                const blob = new Blob([data.csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error(e);
            alert('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= meta.last_page) {
            fetchProducts(newPage);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete (archive) this product?')) return;
        if (!session) return;

        try {
            const res = await fetch(`${API_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                fetchProducts(meta.page); // Refresh
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
                fetchProducts(meta.page); // Refresh
            } else {
                alert('Failed to restore product');
            }
        } catch (e) {
            alert('Error restoring product');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Product Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your inventory, prices, and availability.</p>
                </div>
                <Link
                    href="/admin/products/new"
                    className="bg-black text-white px-6 py-2.5 rounded hover:bg-gray-800 text-sm font-medium transition-colors shadow-lg shadow-gray-200"
                >
                    + Add New Product
                </Link>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="border rounded-md px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black w-full md:w-auto capitalize"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.slug}>
                            {cat.translation?.name || cat.slug}
                        </option>
                    ))}
                </select>

                <select
                    className="border rounded-md px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-black w-full md:w-auto"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                >
                    <option value="created_at:desc">Newest First</option>
                    <option value="created_at:asc">Oldest First</option>
                    <option value="price:desc">Price: High to Low</option>
                    <option value="price:asc">Price: Low to High</option>
                    <option value="quantity:asc">Low Stock</option>
                </select>

                <div className="flex rounded-md shadow-sm" role="group">
                    <button
                        onClick={() => setStatus('active')}
                        className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${status === 'active' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setStatus('all')}
                        className={`px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg ${status === 'all' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        All
                    </button>
                </div>

                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                >
                    {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
            </div>

            {/* Bulk Action Toolbar */}
            {selectedIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-6 flex items-center justify-between animate-fade-in-down">
                    <span className="text-blue-700 font-medium text-sm">
                        {selectedIds.length} items selected
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBulkAction('archive')}
                            className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-50 hover:text-red-600"
                        >
                            Archive Selected
                        </button>
                        <button
                            onClick={() => handleBulkAction('restore')}
                            className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-gray-50 hover:text-green-600"
                        >
                            Restore Selected
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading products...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 w-4">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={products.length > 0 && selectedIds.length === products.length}
                                                className="rounded border-gray-300 text-black focus:ring-black"
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {products.map(product => {
                                        const transEn = product.translation?.locale === 'en' ? product.translation : null;

                                        return (
                                            <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${!product.is_active ? 'bg-gray-50/50' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(product.id)}
                                                        onChange={() => handleSelectRow(product.id)}
                                                        className="rounded border-gray-300 text-black focus:ring-black"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 relative bg-gray-100 rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                                                            <ProductImage
                                                                src={product.images?.[0] || product.image}
                                                                alt={product.slug}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 flex items-center gap-1">
                                                                {product.translation?.title || product.slug}
                                                                {/* Featured Icons */}
                                                                {product.featured_section === 'chapter_1' && <span className="material-symbols-outlined text-amber-500 text-[18px] filled-icon" title="Chapter I: Featured">star</span>}
                                                                {product.featured_section === 'chapter_2' && <span className="material-symbols-outlined text-green-600 text-[18px] filled-icon" title="Chapter II: Ritual">spa</span>}
                                                                {product.featured_section === 'chapter_3' && <span className="material-symbols-outlined text-red-500 text-[18px] filled-icon" title="Chapter III: Gift">redeem</span>}
                                                                {/* Fallback Legacy */}
                                                                {product.is_featured && !product.featured_section && (
                                                                    <span className="material-symbols-outlined text-gray-400 text-[16px] filled-icon" title="Legacy Featured">star_half</span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500 font-mono">{product.slug}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 capitalize text-sm text-gray-600">
                                                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                                        {product.category?.slug || (typeof product.category === 'string' ? product.category : '') || 'Uncategorized'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {product.quantity === 0 ? (
                                                        <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">Out of Stock</span>
                                                    ) : (
                                                        <span className={`font-medium ${product.quantity < 5 ? 'text-amber-600' : 'text-gray-700'}`}>
                                                            {product.quantity} units
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">
                                                    {formatPrice(Number(product.price))}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${product.is_active
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                        {product.is_active ? 'ACTIVE' : 'ARCHIVED'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-3">
                                                    <Link
                                                        href={`/admin/products/${product.id}`}
                                                        className="text-gray-600 hover:text-black text-sm font-medium hover:underline"
                                                    >
                                                        Edit
                                                    </Link>
                                                    {product.is_active ? (
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="text-red-500 hover:text-red-700 text-sm hover:underline"
                                                        >
                                                            Archive
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRestore(product.id)}
                                                            className="text-green-600 hover:text-green-700 text-sm hover:underline"
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
                        </div>

                        {/* Pagination Footer */}
                        {products.length > 0 && (
                            <Pagination
                                meta={meta}
                                onPageChange={(page) => handlePageChange(page)}
                            />
                        )}

                        {products.length === 0 && (
                            <div className="p-12 text-center flex flex-col items-center">
                                <span className="text-4xl mb-4">📦</span>
                                <h3 className="text-lg font-bold text-gray-900">No products found</h3>
                                <p className="text-gray-500 mt-1 max-w-sm">
                                    Try adjusting your search or filters to find what you're looking for.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
