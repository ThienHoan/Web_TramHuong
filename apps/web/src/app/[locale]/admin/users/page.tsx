'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';

import Pagination from '@/components/ui/Pagination';
import { ADMIN_PAGE_LIMIT } from '@/lib/constants';

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
    is_banned: boolean;
    created_at: string;
    last_sign_in_at: string;
}

export default function AdminUsersPage() {
    const { session, role, loading: authLoading } = useAuth();
    const router = useRouter();
    // const t = useTranslations('Admin'); // Improve translation scope later

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Fix type
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, last_page: 1, limit: ADMIN_PAGE_LIMIT });
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch Users
    const fetchUsers = useCallback(async () => {
        if (!session) return;
        setLoading(true);
        const params = new URLSearchParams({
            page: page.toString(),
            limit: ADMIN_PAGE_LIMIT.toString(),
        });
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (roleFilter) params.append('role', roleFilter);

        try {
            const res = await fetch(`${API_URL}/users?${params.toString()}`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.data);
            setMeta(data.meta);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [session, page, debouncedSearch, roleFilter, API_URL]);

    useEffect(() => {
        if (!authLoading && role !== 'ADMIN') {
            router.push('/');
        } else if (session) {
            fetchUsers();
        }
    }, [authLoading, role, router, session, fetchUsers]);

    // Actions
    const handleRoleChange = async (id: string, newRole: string) => {
        if (!confirm('Are you sure you want to change this user role?')) return;
        try {
            const res = await fetch(`${API_URL}/users/${id}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) fetchUsers();
        } catch (e) { console.error(e); }
    };

    const handleBanToggle = async (id: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'Unban' : 'Ban'} this user?`)) return;
        try {
            const res = await fetch(`${API_URL}/users/${id}/ban`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ is_banned: !currentStatus })
            });
            if (res.ok) fetchUsers();
        } catch (e) { console.error(e); }
    };

    if (authLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500 text-sm">Manage user accounts, roles, and access.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                >
                    <option value="">All Roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="STAFF">Staff</option>
                    <option value="CUSTOMER">Customer</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading users...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-medium text-gray-500">USER</th>
                                        <th className="px-6 py-4 font-medium text-gray-500">ROLE</th>
                                        <th className="px-6 py-4 font-medium text-gray-500">STATUS</th>
                                        <th className="px-6 py-4 font-medium text-gray-500">REGISTERED</th>
                                        <th className="px-6 py-4 font-medium text-gray-500 text-right">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link href={`/admin/users/${user.id}`} className="block group">
                                                    <div>
                                                        <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                            {user.full_name || 'No Name'}
                                                        </p>
                                                        <p className="text-gray-500 text-xs group-hover:text-indigo-400">
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer
                                                ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                            user.role === 'STAFF' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-700'}`}
                                                >
                                                    <option value="CUSTOMER">Customer</option>
                                                    <option value="STAFF">Staff</option>
                                                    <option value="ADMIN">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${user.is_banned
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {user.is_banned ? 'Banned' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleBanToggle(user.id, user.is_banned)}
                                                    className={`text-xs px-3 py-1 rounded border transition-colors
                                                ${user.is_banned
                                                            ? 'border-green-200 text-green-600 hover:bg-green-50'
                                                            : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                                                >
                                                    {user.is_banned ? 'Unban' : 'Ban'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                No users found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="bg-white border-t border-gray-100">
                            <Pagination
                                meta={meta}
                                onPageChange={(p) => setPage(p)}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
