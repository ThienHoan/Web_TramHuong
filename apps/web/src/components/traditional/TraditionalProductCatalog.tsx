'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/components/providers/CartProvider';
import { useState } from 'react';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';

export default function TraditionalProductCatalog({ products }: { products: any[] }) {
    const t = useTranslations('HomePage');
    const { formatPrice } = useCurrency();
    const { items } = useCart();

    // Mock filtering logic for UI demonstration
    const currentProducts = products.length > 0 ? products : [];

    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased min-h-screen flex flex-col bg-pattern-lotus selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />

            {/* Breadcrumb / Page Header */}
            <div className="w-full bg-gradient-to-r from-trad-bg-light via-white to-trad-bg-light border-b border-trad-border-warm">
                <div className="container mx-auto px-4 md:px-8 xl:px-20 py-6 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-trad-red-900 mb-2 font-display">Tất Cả Sản Phẩm</h1>
                    <nav className="flex justify-center text-sm text-trad-text-muted/80 font-body">
                        <Link className="hover:text-trad-primary transition-colors" href="/">Trang chủ</Link>
                        <span className="mx-2 text-trad-border-warm">•</span>
                        <span className="font-medium text-trad-primary">Sản phẩm</span>
                    </nav>
                </div>
            </div>

            <main className="flex-grow w-full container mx-auto px-4 md:px-8 xl:px-20 py-10">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Sidebar Filter */}
                    <aside className="w-full lg:w-72 shrink-0 space-y-6">
                        <div className="lg:hidden flex items-center justify-between mb-4">
                            <span className="text-lg font-bold font-display text-trad-text-main">Bộ lọc sản phẩm</span>
                            <button className="flex items-center gap-2 text-sm font-medium text-trad-primary border border-trad-primary/30 px-4 py-2 rounded bg-white shadow-sm">
                                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                Lọc ngay
                            </button>
                        </div>
                        <div className="hidden lg:block space-y-8 p-6 bg-white rounded-xl border border-trad-border-warm shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 opacity-10 pointer-events-none">
                                <span className="material-symbols-outlined text-6xl text-trad-primary">spa</span>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-trad-text-main font-display border-b border-trad-border-warm pb-2">Danh mục</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <input className="h-4 w-4 rounded border-trad-border-warm text-trad-primary focus:ring-trad-primary" id="cat-nu" type="checkbox" />
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-trad-text-main" htmlFor="cat-nu">Nụ Trầm Hương</label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input className="h-4 w-4 rounded border-trad-border-warm text-trad-primary focus:ring-trad-primary" id="cat-vong" type="checkbox" />
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-trad-text-main" htmlFor="cat-vong">Vòng Tay Trầm</label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input className="h-4 w-4 rounded border-trad-border-warm text-trad-primary focus:ring-trad-primary" id="cat-nhang" type="checkbox" />
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-trad-text-main" htmlFor="cat-nhang">Nhang Không Tăm</label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input className="h-4 w-4 rounded border-trad-border-warm text-trad-primary focus:ring-trad-primary" id="cat-thac" type="checkbox" />
                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-trad-text-main" htmlFor="cat-thac">Thác Khói</label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-trad-text-main font-display border-b border-trad-border-warm pb-2">Khoảng giá</h3>
                                <div className="pt-2">
                                    <div className="relative h-1.5 w-full rounded-full bg-trad-border-warm mb-6">
                                        <div className="absolute left-0 h-full w-2/3 rounded-full bg-trad-primary"></div>
                                        <div className="absolute -top-1.5 left-[66%] h-4 w-4 rounded-full border-2 border-trad-primary bg-white shadow cursor-pointer hover:scale-110 transition-transform"></div>
                                        <div className="absolute -top-1.5 left-0 h-4 w-4 rounded-full border-2 border-trad-primary bg-white shadow cursor-pointer hover:scale-110 transition-transform"></div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="grid w-full items-center gap-1.5">
                                            <label className="text-[10px] uppercase font-bold text-trad-text-muted">Từ</label>
                                            <input className="flex h-9 w-full rounded-md border border-trad-border-warm bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary disabled:cursor-not-allowed disabled:opacity-50" placeholder="0" defaultValue="100.000" />
                                        </div>
                                        <span className="text-trad-text-muted pt-5">-</span>
                                        <div className="grid w-full items-center gap-1.5">
                                            <label className="text-[10px] uppercase font-bold text-trad-text-muted">Đến</label>
                                            <input className="flex h-9 w-full rounded-md border border-trad-border-warm bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary disabled:cursor-not-allowed disabled:opacity-50" placeholder="MAX" defaultValue="5.000.000" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary disabled:pointer-events-none disabled:opacity-50 bg-trad-primary text-white shadow hover:bg-trad-primary-dark h-9 px-4 py-2 uppercase tracking-wide mt-4">
                                Áp dụng bộ lọc
                            </button>
                        </div>
                    </aside>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 p-2 border-b border-trad-border-warm">
                            <p className="text-sm text-trad-text-muted font-medium">Hiển thị <span className="font-bold text-trad-primary">{currentProducts.length}</span> sản phẩm</p>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-trad-text-main hidden sm:block">Sắp xếp theo:</label>
                                <div className="relative">
                                    <select className="h-9 rounded-md border border-trad-border-warm bg-white py-1 pl-3 pr-8 text-sm focus:border-trad-primary focus:outline-none focus:ring-1 focus:ring-trad-primary">
                                        <option>Mới nhất</option>
                                        <option>Giá tăng dần</option>
                                        <option>Giá giảm dần</option>
                                        <option>Bán chạy nhất</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                            {products.length > 0 ? products.map((product) => (
                                <div key={product.id} className="rounded-xl border border-trad-border-warm bg-white text-trad-text-main shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col overflow-hidden">
                                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-trad-bg-warm">
                                        <span className="absolute left-2 top-2 z-10 rounded bg-trad-red-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">-15%</span>
                                        <ProductImage
                                            src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                                            alt={product.translation?.title}
                                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                            <button className="h-9 w-9 rounded-full bg-white text-trad-text-main hover:text-trad-primary hover:bg-trad-bg-warm shadow-lg flex items-center justify-center transition-colors" title="Xem nhanh">
                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                            </button>
                                            <button className="h-9 w-9 rounded-full bg-white text-trad-text-main hover:text-trad-primary hover:bg-trad-bg-warm shadow-lg flex items-center justify-center transition-colors" title="Yêu thích">
                                                <span className="material-symbols-outlined text-[20px]">favorite</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col p-5">
                                        <div className="mb-2 flex text-trad-primary text-[14px]">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <span key={i} className="material-symbols-outlined filled text-[16px]">star</span>
                                            ))}
                                        </div>
                                        <h3 className="mb-2 text-lg font-bold font-display leading-tight text-trad-text-main group-hover:text-trad-primary transition-colors line-clamp-2">
                                            <Link href={`/products/${product.slug}`}>{product.translation?.title}</Link>
                                        </h3>
                                        <div className="mt-auto pt-3 flex flex-col gap-3">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xl font-bold text-trad-primary">{formatPrice(product.price)}</span>
                                            </div>
                                            <Link href={`/products/${product.slug}`} className="w-full">
                                                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-trad-primary text-white shadow bg-trad-primary hover:bg-trad-primary-dark h-9 px-4 py-2 uppercase tracking-wide w-full gap-2 group-hover:bg-trad-bg-warm group-hover:text-trad-primary border border-transparent group-hover:border-trad-primary">
                                                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                                                    Thêm vào giỏ
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                // Render placeholder if no products (or mock cards as in design)
                                <div className="rounded-xl border border-trad-border-warm bg-white text-trad-text-main shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col overflow-hidden">
                                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-trad-bg-warm">
                                        <img className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg" alt="Placeholder" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
