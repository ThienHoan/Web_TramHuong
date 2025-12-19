import ZenButton from './ZenButton';
import ProductImage from '../ui/ProductImage';

export default function ZenProductDetail({ product }: { product: any }) {
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
                    <ZenButton>Acquire — ${product.price}</ZenButton>
                </div>
            </div>
        </div>
    );
}
