'use client';

import { useState } from 'react';
import { useCart } from '../providers/CartProvider';
import { useCurrency } from '@/hooks/useCurrency';
import Image from 'next/image';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import { Link } from '@/i18n/routing';

export default function TraditionalProductDetail({ product }: { product: any }) {
    const { addItem } = useCart();
    const { formatPrice } = useCurrency();
    const [selectedImage, setSelectedImage] = useState(product.images[0]);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            slug: product.slug,
            title: product.translation.title,
            price: Number(product.price),
            image: product.images[0],
            quantity: quantity
        });
        alert('Đã thêm sản phẩm vào giỏ hàng!');
    };

    const handleQuantityChange = (delta: number) => {
        setQuantity(prev => Math.max(1, prev + delta));
    };

    // Mock data for reviews/related (to match UI design as requested)
    const renderStars = (count: number) => (
        <div className="flex text-trad-primary">
            {[...Array(5)].map((_, i) => (
                <span key={i} className={`material-symbols-outlined !text-[20px] ${i < count ? 'filled' : ''}`}>
                    {i < count ? 'star' : 'star_border'}
                </span>
            ))}
        </div>
    );

    return (
        <div className="bg-trad-bg-light min-h-screen font-display">
            <TraditionalHeader />

            <main className="min-h-screen bg-pattern-lotus pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    {/* Breadcrumbs */}
                    <nav aria-label="Breadcrumb" className="flex mb-8 text-sm">
                        <ol className="inline-flex items-center space-x-2">
                            <li className="inline-flex items-center">
                                <Link className="text-trad-text-muted hover:text-trad-primary font-medium transition-colors" href="/">Trang chủ</Link>
                            </li>
                            <li className="text-trad-text-muted">/</li>
                            <li className="inline-flex items-center">
                                <Link className="text-trad-text-muted hover:text-trad-primary font-medium transition-colors" href="/products">Nhang trầm</Link>
                            </li>
                            <li className="text-trad-text-muted">/</li>
                            <li aria-current="page">
                                <span className="text-trad-text-main font-semibold truncate max-w-[200px] md:max-w-none">{product.translation.title}</span>
                            </li>
                        </ol>
                    </nav>

                    {/* Product Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Left Column: Gallery */}
                        <div className="lg:col-span-7 flex flex-col gap-4">
                            {/* Main Image */}
                            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-trad-bg-warm border border-trad-border-warm group shadow-sm">
                                <div className="relative w-full h-full">
                                    <Image
                                        src={selectedImage || product.images[0]}
                                        alt={product.translation.title}
                                        fill
                                        className="object-cover transition-transform duration-500 hover:scale-105"
                                    />
                                </div>
                                <div className="absolute top-4 left-4 bg-trad-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
                                    Bán chạy nhất
                                </div>
                                <button className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg hover:bg-white text-trad-text-main shadow-sm transition-all z-10" title="Phóng to">
                                    <span className="material-symbols-outlined">zoom_in</span>
                                </button>
                            </div>
                            {/* Thumbnails */}
                            <div className="grid grid-cols-4 gap-4">
                                {product.images.map((img: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(img)}
                                        className={`relative aspect-square rounded-lg overflow-hidden border transition-all ${selectedImage === img ? 'border-trad-primary ring-2 ring-trad-primary/20 ring-offset-2' : 'border-trad-border-warm hover:border-trad-primary opacity-70 hover:opacity-100'}`}
                                    >
                                        <Image src={img} alt={`Prod thumb ${idx}`} fill className="object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right Column: Product Info */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-trad-primary text-sm font-bold uppercase tracking-widest mb-2">Trầm Hương Tự Nhiên</div>
                                <h1 className="text-3xl md:text-4xl font-bold text-trad-text-main mb-4 leading-tight">{product.translation.title}</h1>

                                {/* Ratings */}
                                <div className="flex items-center gap-4 mb-6">
                                    {renderStars(5)}
                                    <span className="text-trad-text-main text-sm font-medium border-l border-trad-border-warm pl-4 underline decoration-trad-text-muted/50 cursor-pointer">128 Đánh giá</span>
                                    <span className="text-trad-text-muted text-sm border-l border-trad-border-warm pl-4">Đã bán 1.2k</span>
                                </div>

                                {/* Price */}
                                <div className="flex items-end gap-3 mb-6 bg-trad-bg-warm p-4 rounded-lg border border-trad-border-warm/50">
                                    <span className="text-3xl font-bold text-trad-primary">{formatPrice(Number(product.price))}</span>
                                    <span className="text-lg text-trad-text-muted line-through mb-1 opacity-60">
                                        {formatPrice(Number(product.price) * 1.2)}
                                    </span>
                                    <span className="ml-auto bg-trad-red-900/10 text-trad-red-900 px-2 py-1 rounded text-xs font-bold">-20%</span>
                                </div>

                                <p className="text-trad-text-main/80 leading-relaxed mb-8">
                                    {product.translation.description}
                                </p>
                                <hr className="border-trad-border-warm mb-8" />

                                {/* Options */}
                                <div className="flex flex-col gap-6">
                                    {/* Size Selector - Mock for Demo */}
                                    <div>
                                        <h3 className="text-sm font-bold text-trad-text-main mb-3">Kích thước</h3>
                                        <div className="flex flex-wrap gap-3">
                                            <label className="cursor-pointer">
                                                <input defaultChecked className="peer sr-only" name="size" type="radio" />
                                                <div className="px-4 py-2 rounded border border-trad-border-warm bg-white text-trad-text-main peer-checked:bg-trad-primary peer-checked:text-white peer-checked:border-trad-primary hover:border-trad-primary transition-all text-sm font-medium">
                                                    30cm (Ngắn)
                                                </div>
                                            </label>
                                            <label className="cursor-pointer">
                                                <input className="peer sr-only" name="size" type="radio" />
                                                <div className="px-4 py-2 rounded border border-trad-border-warm bg-white text-trad-text-main peer-checked:bg-trad-primary peer-checked:text-white peer-checked:border-trad-primary hover:border-trad-primary transition-all text-sm font-medium">
                                                    40cm (Tiêu chuẩn)
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Quantity & Add to Cart */}
                                    <div className="flex flex-wrap gap-4 items-stretch pt-4">
                                        <div className="flex items-center border border-trad-border-warm rounded-lg bg-white h-12">
                                            <button onClick={() => handleQuantityChange(-1)} className="px-3 py-1 hover:text-trad-primary transition-colors h-full flex items-center justify-center w-10">
                                                <span className="material-symbols-outlined !text-[18px]">remove</span>
                                            </button>
                                            <input
                                                className="w-12 text-center border-none focus:ring-0 text-trad-text-main font-bold p-0 bg-transparent h-full"
                                                type="text"
                                                value={quantity}
                                                readOnly
                                            />
                                            <button onClick={() => handleQuantityChange(1)} className="px-3 py-1 hover:text-trad-primary transition-colors h-full flex items-center justify-center w-10">
                                                <span className="material-symbols-outlined !text-[18px]">add</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleAddToCart}
                                            className="flex-1 bg-trad-primary hover:bg-trad-primary-dark text-white font-bold rounded-lg px-8 h-12 flex items-center justify-center gap-2 transition-colors shadow-md shadow-trad-primary/20"
                                        >
                                            <span className="material-symbols-outlined">shopping_bag</span>
                                            Thêm vào giỏ hàng
                                        </button>
                                        <button className="h-12 w-12 rounded-lg border border-trad-border-warm flex items-center justify-center bg-white text-trad-text-muted hover:text-trad-red-900 hover:border-trad-red-900 transition-all">
                                            <span className="material-symbols-outlined filled">favorite</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Trust Badges */}
                                <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-trad-border-warm">
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary !text-[32px]">verified</span>
                                        <span className="text-xs font-medium text-trad-text-main">100% Tự nhiên</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary !text-[32px]">local_shipping</span>
                                        <span className="text-xs font-medium text-trad-text-main">Giao hàng nhanh</span>
                                    </div>
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary !text-[32px]">security</span>
                                        <span className="text-xs font-medium text-trad-text-main">Đổi trả 7 ngày</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Tabs Section */}
                    <div className="mt-20">
                        <div className="border-b border-trad-border-warm mb-8">
                            <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                                {['description', 'specs', 'story', 'reviews'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-4 border-b-2 font-medium text-lg transition-colors whitespace-nowrap px-2 ${activeTab === tab
                                            ? 'text-trad-primary border-trad-primary font-bold'
                                            : 'text-trad-text-muted border-transparent hover:text-trad-primary hover:border-trad-primary/50'
                                            }`}
                                    >
                                        {tab === 'description' && 'Mô tả chi tiết'}
                                        {tab === 'specs' && 'Thông số kỹ thuật'}
                                        {tab === 'story' && 'Câu chuyện sản phẩm'}
                                        {tab === 'reviews' && 'Đánh giá (128)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            {/* Left: Content Area */}
                            <div className="lg:col-span-2 text-trad-text-main/90 leading-loose space-y-6">
                                {activeTab === 'description' && (
                                    <div className="animation-fade-in">
                                        <p className="text-lg font-medium">{product.translation.description}</p>
                                        <p className="mt-4">{product.translation.story}</p>
                                        <h3 className="text-2xl font-bold text-trad-text-main mt-8 mb-4">Lợi ích khi sử dụng</h3>
                                        <ul className="list-none space-y-3">
                                            <li className="flex gap-3">
                                                <span className="material-symbols-outlined text-trad-primary mt-1">check_circle</span>
                                                <span>Thanh lọc không khí, tẩy uế, mang lại vượng khí cho gia chủ.</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="material-symbols-outlined text-trad-primary mt-1">check_circle</span>
                                                <span>Hương thơm dịu nhẹ giúp thư giãn tinh thần, giảm căng thẳng, mệt mỏi.</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                {activeTab === 'specs' && (
                                    <div className="space-y-4">
                                        {typeof product.translation.specifications === 'string'
                                            ? product.translation.specifications.split('. ').map((spec: string, i: number) => (
                                                <div key={i} className="flex justify-between py-3 border-b border-trad-border-subtle hover:bg-gray-50 px-2 rounded">
                                                    <span>{spec}</span>
                                                </div>
                                            ))
                                            : Object.entries(product.translation.specifications || {}).map(([key, value], i: number) => (
                                                <div key={i} className="flex justify-between py-3 border-b border-trad-border-subtle hover:bg-gray-50 px-2 rounded">
                                                    <span className="text-trad-text-muted font-medium">{key}</span>
                                                    <span className="text-trad-text-main">{String(value)}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}

                                {/* Other tabs can be implemented similarly */}
                            </div>

                            {/* Right: Specs Table (Always visible or contextual) */}
                            <div className="lg:col-span-1 hidden lg:block">
                                <div className="bg-white p-6 rounded-xl border border-trad-border-warm shadow-sm sticky top-24">
                                    <h3 className="text-xl font-bold text-trad-text-main mb-6 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-trad-primary">analytics</span>
                                        Thông số kỹ thuật
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between py-3 border-b border-trad-border-subtle">
                                            <span className="text-trad-text-muted">Xuất xứ</span>
                                            <span className="font-medium text-trad-text-main">Việt Nam</span>
                                        </div>
                                        <div className="flex justify-between py-3 border-b border-trad-border-subtle">
                                            <span className="text-trad-text-muted">Thương hiệu</span>
                                            <span className="font-medium text-trad-text-main">Thiên Phúc</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 bg-trad-bg-warm p-4 rounded-lg border border-trad-primary/20">
                                        <p className="text-sm text-trad-text-muted italic text-center">
                                            "Hương trầm là cầu nối tâm linh, là nét đẹp văn hóa ngàn đời của người Việt."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reviews Section Summary (Static from HTML for now to match UI) */}
                    <div className="mt-20 pt-10 border-t border-trad-border-warm">
                        <h2 className="text-3xl font-bold text-trad-text-main mb-10 text-center">Đánh giá từ khách hàng</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                            {/* Review Card 1 */}
                            <div className="bg-white p-6 rounded-xl border border-trad-border-warm shadow-sm">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-10 w-10 rounded-full bg-trad-bg-warm flex items-center justify-center text-trad-primary font-bold">NH</div>
                                    <div>
                                        <h4 className="font-bold text-trad-text-main">Nguyễn Hùng</h4>
                                        {renderStars(5)}
                                    </div>
                                    <span className="ml-auto text-xs text-trad-text-muted">2 ngày trước</span>
                                </div>
                                <p className="text-trad-text-main/80 text-sm leading-relaxed">
                                    "Mùi hương rất thơm và dễ chịu, không bị gắt như các loại nhang hóa học ngoài chợ. Đóng gói cẩn thận, hộp đẹp."
                                </p>
                            </div>
                            {/* Review Card 2 */}
                            <div className="bg-white p-6 rounded-xl border border-trad-border-warm shadow-sm">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-10 w-10 rounded-full bg-trad-bg-warm flex items-center justify-center text-trad-primary font-bold">TL</div>
                                    <div>
                                        <h4 className="font-bold text-trad-text-main">Trần Lan</h4>
                                        {renderStars(5)}
                                    </div>
                                    <span className="ml-auto text-xs text-trad-text-muted">1 tuần trước</span>
                                </div>
                                <p className="text-trad-text-main/80 text-sm leading-relaxed">
                                    "Shop tư vấn nhiệt tình. Nhang cháy đều, ít khói, rất phù hợp cho căn hộ chung cư. Sẽ ủng hộ dài dài."
                                </p>
                            </div>
                            {/* Review Card 3 */}
                            <div className="bg-white p-6 rounded-xl border border-trad-border-warm shadow-sm">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-10 w-10 rounded-full bg-trad-bg-warm flex items-center justify-center text-trad-primary font-bold">MV</div>
                                    <div>
                                        <h4 className="font-bold text-trad-text-main">Minh Vương</h4>
                                        {renderStars(4)}
                                    </div>
                                    <span className="ml-auto text-xs text-trad-text-muted">2 tuần trước</span>
                                </div>
                                <p className="text-trad-text-main/80 text-sm leading-relaxed">
                                    "Sản phẩm tốt trong tầm giá. Giao hàng hơi chậm một chút nhưng bù lại chất lượng sản phẩm rất tuyệt vời."
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Related Products - UI Placeholder to match design */}
                    <div className="mt-10 mb-20">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-trad-text-main">Sản phẩm liên quan</h2>
                            <Link className="text-trad-primary hover:text-trad-primary-dark font-medium flex items-center gap-1" href="/products">
                                Xem tất cả <span className="material-symbols-outlined">arrow_forward</span>
                            </Link>
                        </div>
                        {/* Placeholder Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="group bg-white border border-trad-border-warm rounded-lg overflow-hidden hover:shadow-md transition-all">
                                    <div className="aspect-[3/4] overflow-hidden relative bg-trad-bg-warm">
                                        {/* Placeholder Image */}
                                        <div className="absolute inset-0 flex items-center justify-center text-trad-text-muted/20">
                                            <span className="material-symbols-outlined text-4xl">spa</span>
                                        </div>
                                        <button className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-trad-primary">
                                            <span className="material-symbols-outlined !text-[20px]">shopping_cart</span>
                                        </button>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-trad-text-main mb-1 line-clamp-1">Sản phẩm tham khảo {item}</h3>
                                        <p className="text-trad-primary font-bold">450.000₫</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
