'use client';

import ZenButton from './ZenButton';
import ProductImage from '../ui/ProductImage';
import { useCart } from '../providers/CartProvider';
import { useCurrency } from '@/hooks/useCurrency';

export default function ZenProductDetail({ product }: { product: any }) {
    const { addItem } = useCart();
    const { formatPrice } = useCurrency();

    const handleAddToCart = () => {
        addItem({
            id: product.id,
            slug: product.slug,
            title: product.translation.title,
            price: Number(product.price),
            image: product.images[0]
        });
        alert('Artifact acquired.');
    };

    return (
        <div className="bg-zen-50 min-h-screen grid grid-cols-1 md:grid-cols-2 text-zen-900 font-serif">
            <div className="bg-zen-100 flex items-center justify-center p-20 text-zen-300 italic text-4xl relative">
                <ProductImage src={product.images[0]} alt={product.translation.title} />
            </div>
            <div className="flex flex-col justify-center p-24 space-y-8">
                <div className="space-y-4">
                    <h1 className="text-5xl font-thin tracking-wider">{product.translation.title}</h1>
                    <p className="text-xl text-zen-800 italic font-light">{product.translation.description}</p>
                </div>

                <div className="h-px w-24 bg-zen-800/20"></div>

                <div className="prose prose-stone prose-lg text-zen-800 leading-relaxed">
                    <p>{product.translation.story}</p>
                </div>

                <div className="pt-8">
                    {product.quantity > 0 ? (
                        <ZenButton onClick={handleAddToCart}>Acquire — {formatPrice(Number(product.price))}</ZenButton>
                    ) : (
                        <button disabled className="px-8 py-3 bg-gray-300 text-gray-500 cursor-not-allowed font-serif tracking-widest uppercase text-sm border border-gray-400">
                            Sold Out
                        </button>
                    )}
                    {product.quantity > 0 && product.quantity < 5 && (
                        <p className="text-xs text-red-800 mt-2 italic">Only {product.quantity} left in archive.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
