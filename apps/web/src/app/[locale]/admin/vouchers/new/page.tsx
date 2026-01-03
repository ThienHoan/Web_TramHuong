'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing'; // Ensure Link is imported if needed, though we use router mainly
import { createVoucher } from '@/lib/api-client';
import { toast } from 'sonner';

export default function NewVoucherPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'PERCENTAGE', // PERCENTAGE | FIXED_AMOUNT
        discount_amount: 0,
        min_order_value: 0,
        max_discount_amount: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        usage_limit: 100,
        is_active: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: Number(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.code || !formData.start_date || !formData.end_date) {
            toast.error('Vui lòng điền đầy đủ các trường bắt buộc.');
            return;
        }

        if (formData.code.includes(' ')) {
            toast.error('Mã giảm giá không được chứa khoảng trắng.');
            return;
        }

        setLoading(true);
        try {
            // Clean up data before sending
            const payload = {
                ...formData,
                code: formData.code.toUpperCase(), // Normalize code
                max_discount_amount: formData.discount_type === 'PERCENTAGE' ? formData.max_discount_amount : undefined // Send only if percentage? Or backend handles? Backend allows null.
            };

            await createVoucher(payload as any);
            toast.success('Tạo mã giảm giá thành công!');
            router.push('/admin/vouchers');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Có lỗi xảy ra khi tạo mã.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 font-sans">
            <div className="mb-8">
                <Link href="/admin/vouchers" className="text-gray-500 hover:text-purple-600 flex items-center gap-1 text-sm mb-2">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Quay lại danh sách
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Tạo Mã Giảm Giá Mới</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
                {/* Section 1: Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã Code <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="VD: SUMMER2024"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase font-mono"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Mã sẽ được tự động chuyển thành in hoa. Không chứa khoảng trắng.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại Giảm Giá</label>
                        <select
                            name="discount_type"
                            value={formData.discount_type}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        >
                            <option value="PERCENTAGE">Phần trăm (%)</option>
                            <option value="FIXED_AMOUNT">Số tiền cố định (VND)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formData.discount_type === 'PERCENTAGE' ? 'Giá trị (%)' : 'Số tiền giảm (VND)'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="discount_amount"
                            value={formData.discount_amount}
                            onChange={handleChange}
                            min="0"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                        />
                    </div>
                </div>

                {/* Section 2: Limits & Constraints */}
                <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Điều Kiện Áp Dụng</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Đơn hàng tối thiểu (VND)</label>
                            <input
                                type="number"
                                name="min_order_value"
                                value={formData.min_order_value}
                                onChange={handleChange}
                                min="0"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        {formData.discount_type === 'PERCENTAGE' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mức giảm tối đa (VND)</label>
                                <input
                                    type="number"
                                    name="max_discount_amount"
                                    value={formData.max_discount_amount}
                                    onChange={handleChange}
                                    min="0"
                                    placeholder="Để 0 nếu không giới hạn"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Giới hạn số tiền giảm tối đa cho mã phần trăm.</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng mã (Lượt dùng)</label>
                            <input
                                type="number"
                                name="usage_limit"
                                value={formData.usage_limit}
                                onChange={handleChange}
                                min="1"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Timing */}
                <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Thời Gian Hiệu Lực</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Section 4: Status */}
                <div className="border-t border-gray-100 pt-6 flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                        Kích hoạt mã giảm giá ngay sau khi tạo
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Link
                        href="/admin/vouchers"
                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Đang xử lý...' : 'Tạo Mã Giảm Giá'}
                    </button>
                </div>
            </form>
        </div>
    );
}
