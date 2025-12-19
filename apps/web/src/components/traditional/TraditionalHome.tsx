import { useTranslations } from 'next-intl';
import TraditionalButton from './TraditionalButton';
import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';

export default function TraditionalHome({ products }: { products: any[] }) {
    const t = useTranslations('HomePage');

    return (
        <div className="bg-trad-red-900 text-trad-amber-50 min-h-screen font-serif">
            {/* Hero / Banner */}
            <section className="bg-trad-red-950 border-b-4 border-trad-amber-600 py-20 px-4 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10"></div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 text-trad-amber-100 drop-shadow-lg">{t('title')}</h1>
                    <p className="text-xl text-trad-amber-200 mb-8 font-medium">Tinh Hoa Trầm Hương Việt - Uy Tín Tạo Niềm Tin</p>
                    <div className="flex justify-center gap-4">
                        <Link href="/products">
                            <TraditionalButton className="px-8 py-3 text-lg shadow-xl shadow-black/50">Xem Sản Phẩm</TraditionalButton>
                        </Link>
                        <button className="px-8 py-3 border-2 border-trad-amber-700 text-trad-amber-600 font-bold hover:bg-trad-red-900 transition-colors bg-trad-red-950 rounded-sm">
                            Liên Hệ: 1900-XXXX
                        </button>
                    </div>
                </div>
            </section>

            {/* Trust Badges */}
            <section className="bg-trad-amber-600 text-trad-red-950 py-4 font-bold text-sm tracking-wide">
                <div className="max-w-7xl mx-auto flex flex-wrap justify-around gap-4 px-4 uppercase text-center">
                    <span>★ 100% Trầm Hương Tự Nhiên</span>
                    <span>★ Hoàn Tiền X10 Nếu Giả</span>
                    <span>★ Giao Hàng Toàn Quốc</span>
                    <span>★ Tư Vấn Phong Thủy Miễn Phí</span>
                </div>
            </section>

            {/* Featured Grid */}
            <section className="max-w-7xl mx-auto p-8">
                <div className="flex items-center justify-between mb-8 border-b border-trad-amber-700/50 pb-4">
                    <h2 className="text-3xl font-bold text-trad-amber-100 uppercase border-l-4 border-trad-amber-600 pl-3">
                        Sản Phẩm Nổi Bật
                    </h2>
                    <Link href="/products" className="text-trad-amber-600 underline font-bold hover:text-trad-amber-500">
                        Xem Tất Cả &rarr;
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.slice(0, 6).map(product => (
                        <div key={product.id} className="bg-trad-red-950 border border-trad-amber-700 p-4 rounded-sm hover:-translate-y-1 transition-transform group">
                            <div className="aspect-[4/3] bg-black/40 mb-4 border border-trad-amber-900 relative">
                                <span className="absolute top-2 left-2 bg-trad-amber-600 text-trad-red-950 text-xs font-bold px-2 py-1 z-10">
                                    HOT
                                </span>
                                { /* Use local fallback but allow onError to handle it if src is valid */}
                                <ProductImage src={product.images[0]?.startsWith('http') ? product.images[0] : '/placeholder-bracelet.jpg'} alt={product.translation.title} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 text-trad-amber-50 line-clamp-1">{product.translation.title}</h3>
                            <div className="text-xs text-trad-amber-200/60 mb-3 space-y-1 font-mono">
                                {/* Handle specifications whether it comes as JSON object or String */}
                                {typeof product.translation.specifications === 'string'
                                    ? product.translation.specifications.split('.').slice(0, 2).map((s: string, i: number) => <p key={i}>{s}</p>)
                                    : Object.entries(product.translation.specifications || {}).slice(0, 2).map(([k, v]) => (
                                        <p key={k}><span className="opacity-50">{k}:</span> {String(v)}</p>
                                    ))
                                }
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-trad-amber-800/50">
                                <span className="text-xl font-bold text-trad-amber-500">${product.price}</span>
                                <Link href={`/products/${product.slug}`}>
                                    <TraditionalButton className="text-xs py-2 px-4 shadow-none">Chi Tiết</TraditionalButton>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
