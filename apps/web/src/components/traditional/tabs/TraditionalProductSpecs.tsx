'use client';

import React from 'react';

import { Product } from '@/types/product';

interface TraditionalProductSpecsProps {
    product: Product;
}

export default function TraditionalProductSpecs({ product }: TraditionalProductSpecsProps) {
    // Parse specs if it's a string, or use directly if object
    const specsData = React.useMemo(() => {
        if (typeof product.translation?.specifications === 'string') {
            return product.translation?.specifications.split('. ').map((s: string) => {
                const [key, value] = s.split(':');
                return { label: key?.trim() || 'Thông tin', value: value?.trim() || s };
            });
        }
        return Object.entries(product.translation?.specifications || {}).map(([key, value]) => ({
            label: key,
            value: String(value)
        }));
    }, [product.translation?.specifications]);

    // Icon mapping helper
    const getIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('xuất xứ') || l.includes('origin')) return 'public';
        if (l.includes('thành phần') || l.includes('nguyên liệu')) return 'eco';
        if (l.includes('số lượng') || l.includes('quantity')) return 'apps';
        if (l.includes('thời gian') || l.includes('time')) return 'hourglass_empty';
        if (l.includes('bảo quản')) return 'inventory_2';
        if (l.includes('hạn sử dụng')) return 'event';
        return 'info';
    };

    return (
        <div className="animate-fade-in space-y-12">
            {/* Title */}
            <div className="text-center mb-10">
                <h2 className="text-3xl font-serif font-bold text-trad-amber-700 mb-2">Hành Trình Tinh Hoa – Chi Tiết Thấu Đáo</h2>
                <div className="w-20 h-1 bg-trad-primary mx-auto rounded-full"></div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {specsData.map((item, idx: number) => (
                    <div key={idx} className="flex items-start gap-4 p-5 bg-white rounded-lg border border-trad-border-warm hover:border-trad-amber-600 transition-colors shadow-sm group">
                        <div className="shrink-0 w-12 h-12 rounded-full bg-trad-bg-warm flex items-center justify-center text-trad-amber-700 group-hover:bg-trad-primary group-hover:text-white transition-colors">
                            <span className="material-symbols-outlined">{getIcon(item.label)}</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-trad-text-muted text-sm uppercase tracking-wider mb-1">{item.label}</h4>
                            <p className="font-medium text-trad-text-main text-lg">{item.value}</p>
                        </div>
                    </div>
                ))}

                {/* Fallback if few specs */}
                {specsData.length < 3 && (
                    <div className="flex items-start gap-4 p-5 bg-white rounded-lg border border-trad-border-warm border-dashed opacity-70">
                        <div className="shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined">help_outline</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-trad-text-muted text-sm uppercase tracking-wider mb-1">Hỗ trợ</h4>
                            <p className="font-medium text-trad-text-main text-base">Liên hệ shop để biết thêm chi tiết</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Philosophy Quote */}
            <div className="relative mt-16 p-8 bg-trad-bg-warm rounded-2xl text-center border-t-4 border-trad-primary">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-trad-primary">
                    <span className="material-symbols-outlined text-trad-primary text-3xl">format_quote</span>
                </span>
                <p className="text-xl md:text-2xl font-serif italic text-trad-text-main opacity-80 mt-4">
                    &quot;Hương trầm là cầu nối tâm linh, là nét đẹp văn hóa ngàn đời của người Việt. Chúng tôi gìn giữ và lan tỏa giá trị ấy qua từng sản phẩm.&quot;
                </p>
                <div className="mt-4 font-bold text-trad-amber-700 font-display uppercase tracking-widest text-sm">— Trầm Hương Việt</div>
            </div>
        </div>
    );
}
