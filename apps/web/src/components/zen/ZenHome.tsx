import { useTranslations } from 'next-intl';
import ZenButton from './ZenButton';
import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';

export default function ZenHome({ products }: { products: any[] }) {
    const t = useTranslations('HomePage');
    const featuredProduct = products.find(p => p.slug === 'kyara-bracelet') || products[0];

    return (
        <div className="bg-zen-50 text-zen-900 min-h-screen font-serif overflow-hidden">
            {/* Hero Section */}
            <section className="h-screen flex flex-col items-center justify-center text-center p-8 relative">
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    {/* Background noise/texture could go here */}
                </div>

                <h1 className="text-5xl md:text-7xl font-thin tracking-[0.2em] uppercase mb-8 animate-[fadeIn_1s_ease-out]">
                    {t('title')}
                </h1>
                <p className="text-zen-800 text-lg tracking-widest max-w-xl mx-auto mb-12 font-light opacity-80">
                    The scent of enlightenment. <br />
                    Silence. Clarity. Presence.
                </p>
                <div className="animate-[fadeIn_2s_ease-out]">
                    <Link href="/products">
                        <ZenButton>Enter Collection</ZenButton>
                    </Link>
                </div>
            </section>

            {/* Featured Product Section */}
            {featuredProduct && (
                <section className="min-h-screen grid grid-cols-1 md:grid-cols-2">
                    <div className="bg-zen-100 flex items-center justify-center p-12 relative h-[50vh] md:h-auto">
                        <div className="w-3/4 aspect-square relative shadow-2xl shadow-zen-200">
                            <ProductImage src={featuredProduct.images[0]} alt={featuredProduct.translation.title} />
                        </div>
                    </div>
                    <div className="flex flex-col justify-center p-12 md:p-24 space-y-8 bg-zen-50">
                        <span className="text-xs tracking-[0.3em] text-zen-300 uppercase">Featured Artifact</span>
                        <h2 className="text-4xl font-thin">{featuredProduct.translation.title}</h2>
                        <p className="text-zen-800 leading-relaxed font-light italic">
                            "{featuredProduct.translation.story}"
                        </p>
                        <Link href={`/products/${featuredProduct.slug}`}>
                            <ZenButton className="mt-4 border-zen-300 text-xs">Acquire</ZenButton>
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}
