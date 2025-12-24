import { Link } from '@/i18n/routing';
import ZenButton from './ZenButton';
import ProductImage from '../ui/ProductImage';
import WishlistButton from '../product/WishlistButton';

export default function ZenProductList({ products }: { products: any[] }) {
    return (
        <div className="bg-zen-50 min-h-screen p-12 text-zen-900 font-serif">
            <h1 className="text-3xl font-light tracking-widest text-center mb-16 uppercase">Collection</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
                {products.map((product) => (
                    <div key={product.id} className="group cursor-pointer">

                        <div className="bg-zen-100 aspect-square mb-6 flex items-center justify-center text-zen-300 italic relative">
                            <ProductImage src={product.images[0]} alt={product.translation.title} />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <WishlistButton productId={product.id} className="text-zen-700 hover:text-red-500" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-light">{product.translation.title}</h2>
                            <p className="text-xs text-zen-800 tracking-wide line-clamp-2 min-h-[3rem]">
                                {product.translation.description}
                            </p>
                            <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <Link href={`/products/${product.slug}`}>
                                    <ZenButton className="py-2 px-6 text-[10px]">View</ZenButton>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
