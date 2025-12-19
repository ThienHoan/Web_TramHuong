'use client';

import { useCart } from '../providers/CartProvider';
import TraditionalButton from './TraditionalButton';
import ProductImage from '../ui/ProductImage';

export default function TraditionalProductDetail({ product }: { product: any }) {
    const { addItem } = useCart();

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            slug: product.slug,
            title: product.translation.title,
            price: Number(product.price),
            image: product.images[0]
        });
        alert('Added to cart!');
    };

    return (
        <div className="bg-trad-red-900 min-h-screen text-trad-amber-50">
            <div className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* ... existing Gallery ... */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="aspect-[3/4] bg-black/20 border border-trad-amber-700 rounded-sm flex items-center justify-center text-trad-amber-600/50 relative">
                        <ProductImage src={product.images[0]} alt={product.translation.title} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square bg-white/5 border border-trad-amber-700/50 relative">
                                <ProductImage src={product.images[i] || product.images[0]} alt="Gallery" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Info Column */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="border-b border-trad-amber-700/50 pb-6">
                        <h1 className="text-4xl font-bold mb-2 leading-tight">{product.translation.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-trad-amber-600">
                            <span className="bg-trad-red-950 px-2 py-1 border border-trad-amber-700 rounded">Best Seller</span>
                            <span>SKU: {product.slug.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-bold text-lg mb-4 text-trad-amber-600 border-l-4 border-trad-amber-600 pl-3">Mô Tả Sản Phẩm</h3>
                            <p className="text-sm leading-relaxed opacity-90">{product.translation.description}</p>
                            <p className="mt-4 text-sm leading-relaxed opacity-90">{product.translation.story}</p>
                        </div>

                        <div className="bg-trad-red-950 p-6 rounded border border-trad-amber-700">
                            <h3 className="font-bold text-lg mb-4 text-trad-amber-600">Thông Số Kỹ Thuật</h3>
                            <ul className="space-y-3 text-sm">
                                {typeof product.translation.specifications === 'string'
                                    ? product.translation.specifications.split('. ').map((spec: string, i: number) => (
                                        <li key={i} className="flex justify-between border-b border-white/5 pb-2">
                                            <span>{spec}</span>
                                        </li>
                                    ))
                                    : Object.entries(product.translation.specifications || {}).map(([key, value], i: number) => (
                                        <li key={i} className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="opacity-70">{key}</span>
                                            <span>{String(value)}</span>
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                    </div>

                    <div className="bg-trad-amber-50/5 p-6 rounded flex items-center justify-between border border-trad-amber-700/30">
                        <div>
                            <p className="text-xs text-trad-amber-200 mb-1">Giá bán niêm yết:</p>
                            <p className="text-4xl font-bold text-trad-amber-600">${product.price}</p>
                        </div>
                        <div className="flex gap-4">
                            <TraditionalButton onClick={handleAddToCart} className="px-8 py-4 text-xl">Mua Ngay</TraditionalButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
