import { Link } from '@/i18n/routing';
import TraditionalButton from './TraditionalButton';
import ProductImage from '../ui/ProductImage';

export default function TraditionalProductList({ products }: { products: any[] }) {
    return (
        <div className="bg-trad-red-900 min-h-screen p-8 text-trad-amber-50">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 border-b-2 border-trad-amber-700 pb-4">Danh Mục Sản Phẩm</h1>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Sidebar Filter Placeholder */}
                    <div className="hidden md:block col-span-1 bg-trad-red-950 p-4 border border-trad-amber-700 rounded-sm h-fit">
                        <h3 className="font-bold text-lg mb-4 text-trad-amber-600">Bộ Lọc</h3>
                        <ul className="space-y-2 text-sm text-trad-amber-100/80">
                            <li>• Vòng Tay</li>
                            <li>• Nhang Trầm</li>
                            <li>• Tượng Phật</li>
                        </ul>
                    </div>

                    <div className="col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="bg-trad-red-950 border border-trad-amber-700 p-4 rounded-sm hover:border-trad-amber-600 transition-colors">
                                <div className="aspect-[4/3] bg-black/20 mb-4 flex items-center justify-center border border-white/5 relative">
                                    <ProductImage src={product.images[0]} alt={product.translation.title} />
                                </div>
                                <h2 className="font-bold text-lg mb-2 text-trad-amber-100">{product.translation.title}</h2>

                                {/* Specs Teaser */}
                                <p className="text-xs text-trad-amber-100/60 mb-3 font-mono">
                                    {typeof product.translation.specifications === 'string'
                                        ? product.translation.specifications.split('.')[0]
                                        : Object.entries(product.translation.specifications || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
                                    }...
                                </p>

                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xl font-bold text-trad-amber-600">${product.price}</span>
                                    <Link href={`/products/${product.slug}`}>
                                        <TraditionalButton className="text-sm py-2 px-4 shadow-none">Chi Tiết</TraditionalButton>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
