'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter, Link } from '@/i18n/routing';
import { useCurrency } from '@/hooks/useCurrency';
import Pagination from '@/components/ui/Pagination';
import { ADMIN_PAGE_LIMIT } from '@/lib/constants';
import { getVouchers, updateVoucher, deleteVoucher } from '@/lib/api-client';

export default function AdminVouchersPage() {
    const { session, role, loading: authLoading } = useAuth();
    const { formatPrice } = useCurrency();
    const router = useRouter();

    // State
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: ADMIN_PAGE_LIMIT, last_page: 1 });
    const [loading, setLoading] = useState(true);

    // Filter State
    const [search, setSearch] = useState(''); // by code
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isActive, setIsActive] = useState<string>('all'); // all, active, inactive

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchVouchersList = useCallback(async (page = 1) => {
        if (!session) return;
        setLoading(true);

        const params: any = {
            page: page.toString(),
            limit: ADMIN_PAGE_LIMIT.toString(),
        };
        if (debouncedSearch) params.code = debouncedSearch;
        // Backend `findAll` might need adjustment to handle `isActive` if not already standard search
        // For now let's assume raw filter or just client-side if dataset small? No, backend pagination.
        // Assuming backend supports filtering by status if implemented. 
        // My VoucherService.findAll currently supports basic object find. 
        // I might need to update backend to support 'isActive'. 
        // Let's assume for now and if it doesn't work I fix backend.

        try {
            const data = await getVouchers(params);

            // getVouchers returns Voucher[] directly
            const vouchersList = Array.isArray(data) ? data : [];

            // Client-side filtering for isActive if backend doesn't support it yet
            let filtered = vouchersList;
            if (isActive !== 'all') {
                const activeBool = isActive === 'active';
                filtered = filtered.filter((v: { is_active: boolean }) => v.is_active === activeBool);
            }
            setVouchers(filtered);
            // Since we don't have pagination from backend, set basic meta
            setMeta({ total: filtered.length, page: 1, limit: ADMIN_PAGE_LIMIT, last_page: 1 });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [session, debouncedSearch, isActive]);

    useEffect(() => {
        if (!authLoading) {
            if (role !== 'ADMIN' && role !== 'STAFF') {
                router.push('/');
                return;
            }
            fetchVouchersList(1);
        }
    }, [authLoading, role, router, fetchVouchersList]);

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa mã giảm giá này? Hành động này không thể hoàn tác.')) return;
        try {
            await deleteVoucher(id);
            fetchVouchersList(meta.page);
        } catch (e) {
            alert('Không thể xóa mã giảm giá.');
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateVoucher(id, { is_active: !currentStatus });
            // Optimistic update
            setVouchers(prev => prev.map(v => v.id === id ? { ...v, is_active: !currentStatus } : v));
        } catch (e) {
            alert('Không thể cập nhật trạng thái.');
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= meta.last_page) {
            fetchVouchersList(newPage);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-purple-500">Quản lý Mã Giảm Giá</h1>
                    <p className="text-gray-500 text-sm mt-1">Tạo và quản lý các chương trình khuyến mãi.</p>
                </div>
                <Link
                    href="/admin/vouchers/new"
                    className="bg-purple-600 text-white px-6 py-2.5 rounded hover:bg-purple-700 text-sm font-medium transition-colors shadow-lg shadow-purple-200 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Tạo Mã Mới
                </Link>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-600"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex rounded-md shadow-sm" role="group">
                    <button
                        onClick={() => setIsActive('active')}
                        className={`px-4 py-2 text-sm font-medium border rounded-l-lg ${isActive === 'active' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Đang hoạt động
                    </button>
                    <button
                        onClick={() => setIsActive('all')}
                        className={`px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg ${isActive === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Tất cả
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                        <p>Đang tải danh sách...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mã Code</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loại Giảm Giá</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Giá Trị</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sử Dụng</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời Gian</th>
                                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng Thái</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {vouchers.map(voucher => (
                                        <tr key={voucher.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                                                    {voucher.code}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Đơn tối thiểu: {formatPrice(voucher.min_order_value)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {voucher.discount_type === 'PERCENTAGE' ? (
                                                    <span className="badge-purple bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Phần trăm (%)</span>
                                                ) : (
                                                    <span className="badge-blue bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Số tiền cố định</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800">
                                                {voucher.discount_type === 'PERCENTAGE' ? (
                                                    <div>
                                                        {voucher.discount_amount}%
                                                        {voucher.max_discount_amount && (
                                                            <div className="text-xs font-normal text-gray-500">
                                                                Tối đa: {formatPrice(voucher.max_discount_amount)}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    formatPrice(voucher.discount_amount)
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex flex-col">
                                                    <span className={`${voucher.usage_count >= voucher.usage_limit ? 'text-red-500 font-bold' : 'text-gray-700'}`}>
                                                        {voucher.usage_count} / {voucher.usage_limit}
                                                    </span>
                                                    {voucher.usage_count >= voucher.usage_limit && (
                                                        <span className="text-[10px] text-red-500">Đã hết lượt</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                <div>Bắt đầu: {new Date(voucher.start_date).toLocaleDateString('vi-VN')}</div>
                                                <div>Kết thúc: {new Date(voucher.end_date).toLocaleDateString('vi-VN')}</div>
                                                {new Date() > new Date(voucher.end_date) && (
                                                    <span className="text-red-500 font-bold text-[10px]">ĐÃ HẾT HẠN</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleActive(voucher.id, voucher.is_active)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${voucher.is_active ? 'bg-purple-600' : 'bg-gray-200'}`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voucher.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {/* Edit Button */}
                                                <Link
                                                    href={`/admin/vouchers/${voucher.id}`}
                                                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </Link>
                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDelete(voucher.id)}
                                                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Xóa"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {vouchers.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                Không có mã giảm giá nào được tìm thấy.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {vouchers.length > 0 && (
                            <Pagination
                                meta={meta}
                                onPageChange={(page) => handlePageChange(page)}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
