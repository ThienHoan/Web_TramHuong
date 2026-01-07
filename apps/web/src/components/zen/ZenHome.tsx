'use client';

// import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { ProductPrice } from '@/components/ui/ProductPrice';
// import { useCurrency } from '@/hooks/useCurrency';
import ZenFooter from './ZenFooter';
import ScrollReveal from '../ui/ScrollReveal';
import { Product } from '@/types/product';
import Image from 'next/image';

export default function ZenHome({ products }: { products: Product[] }) {
    // Filter for "Zen" affinity products or just take first few for demo
    const zenProducts = products.filter(p => !p.style_affinity || p.style_affinity === 'zen' || p.style_affinity === 'both').slice(0, 3);
    // Fill with fallback if not enough
    const displayProducts = zenProducts.length > 0 ? zenProducts : products.slice(0, 3);

    return (
        <div className="bg-zen-50 dark:bg-zinc-950 font-zen-sans text-zen-800 antialiased selection:bg-zen-secondary selection:text-white">

            {/* Hero Section */}
            <header className="relative h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        alt="Serene agarwood incense smoke"
                        className="w-full h-full object-cover object-center opacity-95 dark:opacity-70 animate-fade-in scale-105 duration-[20s]"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXowdR6auj8zzL27aUJupmrLecfj0ANaqKMe-2rnu1Qv3ophqvBINDqWza6xU3DxCEeaKpwnAZ93FUQsctUo_lKJ3PrFPyMHzUNy2HPJeqQIsVlkmSrVvA_MlzULYOzSkrYfH3Nx6Ou2gDqs4vZzx7C1W0iriuXtWYK6rJnCw9OOvzhpyLEAhxgWekpF4Kr0_690wKsyvU-sdrEE701vu0wNzqUHGUnGHPt-S3WNxw8qHTRWcOXY3BcTajZYzdC9C-o1WpqhEhNv5Y"
                        width={1920}
                        height={1080}
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zen-50/20 dark:to-black/60"></div>
                </div>
                <div className="relative z-10 text-center max-w-5xl px-6 animate-[fadeInUp_1s_ease-out_forwards] mt-16">
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-zen-display font-thin tracking-[0.15em] text-white  mb-8 leading-tight drop-shadow-sm">
                        THE ESSENCE OF<br /><span className="italic font-light tracking-normal">TRANQUILITY</span>
                    </h1>
                    <div className="flex flex-col items-center gap-8 mt-12">
                        <p className="text-sm md:text-base tracking-[0.3em] uppercase text-zen-50/80 font-light max-w-lg leading-relaxed">
                            Discover the pure resonance of Vietnamese Agarwood
                        </p>
                        <Link href="/products" className="group relative px-10 py-4 overflow-hidden bg-zen-secondary/90 hover:bg-zen-secondary text-white transition-all duration-500 rounded-sm mt-4 shadow-lg shadow-zen-secondary/20">
                            <span className="relative z-10 text-xs tracking-widest uppercase font-medium">Discover Collection</span>
                        </Link>
                    </div>
                </div>
                <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce duration-[3000ms] text-zen-400 dark:text-gray-500">
                    <span className="material-symbols-outlined text-3xl font-thin">keyboard_arrow_down</span>
                </div>
            </header>

            <main className="relative z-10 bg-zen-50 dark:bg-zinc-950">

                {/* Product Showcase */}
                <section className="py-24 lg:py-32" id="shop">
                    <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-20 border-b border-zen-200 dark:border-zinc-800 pb-6">
                            <div>
                                <h2 className="text-4xl font-zen-display font-thin text-zen-900 dark:text-white mb-2">Curated Artifacts</h2>
                                <p className="text-[10px] tracking-superwide uppercase text-zen-secondary dark:text-gray-400">Best Sellers Selection</p>
                            </div>
                            <Link href="/products" className="hidden md:flex items-center gap-2 text-xs uppercase tracking-widest hover:text-zen-secondary transition-colors mt-4 md:mt-0 pb-1">
                                View All Products <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                            {displayProducts.map((product, idx) => (
                                <Link key={product.id} href={`/products/${product.slug}`} className={`group cursor-pointer animate-[fadeIn_1.5s_ease-out_forwards]`} style={{ animationDelay: `${(idx + 1) * 100}ms` }}>
                                    <div className="relative aspect-[4/5] overflow-hidden bg-zen-100 dark:bg-zinc-900 mb-6 shadow-xl shadow-zen-200/40 dark:shadow-black/20 rounded-sm">
                                        <ProductImage
                                            src={product.images?.[0] || ''}
                                            alt={product.translation?.title || product.title || 'Product'}
                                            className="h-full w-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-95 group-hover:opacity-100"
                                        />
                                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1.5 text-[10px] uppercase tracking-widest text-zen-secondary font-medium rounded-sm">
                                            {product.slug?.includes('cones') ? 'Premium Wood' : (product.category?.slug === 'burners' ? 'Calming' : 'Meditation')}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center text-center space-y-2">
                                        <h3 className="text-xl font-zen-display font-light uppercase tracking-wide text-zen-900 dark:text-white group-hover:text-zen-secondary transition-colors">
                                            {product.translation?.title}
                                        </h3>
                                        <ProductPrice product={product} size="sm" theme="zen" />
                                        <button className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] uppercase tracking-widest border-b border-zen-800 pb-0.5">View Details</button>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-12 text-center md:hidden">
                            <Link href="/products" className="inline-block text-xs border-b border-zen-800 pb-1 uppercase tracking-widest dark:text-white dark:border-white">
                                View All
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Story Section */}
                <section className="py-24 bg-zen-50 dark:bg-[#151515] relative overflow-hidden" id="story">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-zen-100/50 dark:bg-white/5 skew-x-12 transform translate-x-20 pointer-events-none"></div>
                    <ScrollReveal animation="fade-up" className="max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
                        <div className="order-2 lg:order-1 space-y-10">
                            <div>
                                <span className="block text-zen-secondary text-[10px] uppercase tracking-superwide mb-4">Provenance &amp; Craft</span>
                                <h2 className="text-5xl md:text-6xl font-zen-display font-thin text-zen-900 dark:text-white leading-tight">
                                    Rooted in Hue,<br />Crafted by Time
                                </h2>
                            </div>
                            <div className="space-y-6">
                                <p className="text-zen-800 dark:text-gray-300 font-light leading-8 text-lg">
                                    In the misty highlands of Central Vietnam, our journey begins. For generations, the artisans of Hue have listened to the whispers of the Aquilaria trees.
                                </p>
                                <p className="text-gray-600 dark:text-gray-400 font-light leading-7">
                                    It is not merely a process of harvesting, but a dialogue with nature. Using traditional methods passed down through centuries, we ensure that every chip, every bead, and every stick of incense retains the soulful integrity of the ancient forests. We bring you not just a scent, but a story of resilience and peace.
                                </p>
                            </div>
                            <div className="pt-4">
                                <Link href="/about" className="inline-flex items-center gap-3 px-8 py-3 rounded-sm border border-zen-secondary text-zen-secondary hover:bg-zen-secondary hover:text-white transition-all duration-300 uppercase tracking-widest text-xs font-medium">
                                    Read Our Full Story
                                </Link>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 grid grid-cols-2 gap-4 lg:gap-8">
                            <div className="relative mt-12">
                                <div className="aspect-[3/4] overflow-hidden rounded-sm shadow-xl">
                                    <Image
                                        alt="Artisan hands carving wood"
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPyflVzrUTSkJ8pX7n1Y9O30q9bk9XcTCPXhV6ruLYeAhD34IQJVXxEPUDTDNPZmsNWNDagAOHwTUV926lB8nqwi1dB06Ab4ihmt7rM5tbL0gKc7YdyNL0kdx2PHLF60r-LeukWH-GMPAoUvlpwfO25b-DVRubYNmXGQQi2Dqqte7f2dapLAO5-f9VSVPHqmxpSm2QjFSQ1FsAlfgb6czazxiX_ugLX59TTa6kSHjqAkX2XaYjnK4vsM7JkfYcEMAM7MnNfQZT9-AC"
                                        width={400}
                                        height={600}
                                    />
                                </div>
                                <div className="absolute -bottom-6 -left-6 bg-white dark:bg-zinc-800 p-4 shadow-lg hidden md:block max-w-[150px]">
                                    <p className="font-zen-display italic text-sm text-zen-800 dark:text-gray-300">&quot;Patience is the only true method.&quot;</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-[3/4] overflow-hidden rounded-sm shadow-xl">
                                    <Image
                                        alt="Close up of incense texture"
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXowdR6auj8zzL27aUJupmrLecfj0ANaqKMe-2rnu1Qv3ophqvBINDqWza6xU3DxCEeaKpwnAZ93FUQsctUo_lKJ3PrFPyMHzUNy2HPJeqQIsVlkmSrVvA_MlzULYOzSkrYfH3Nx6Ou2gDqs4vZzx7C1W0iriuXtWYK6rJnCw9OOvzhpyLEAhxgWekpF4Kr0_690wKsyvU-sdrEE701vu0wNzqUHGUnGHPt-S3WNxw8qHTRWcOXY3BcTajZYzdC9C-o1WpqhEhNv5Y"
                                        width={400}
                                        height={600}
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                </section>

                {/* Newsletter */}
                <section className="py-32 bg-zen-50 dark:bg-zinc-950 border-t border-zen-100 dark:border-zinc-900">
                    <ScrollReveal animation="fade-up" className="max-w-3xl mx-auto px-6 text-center">
                        <span className="material-symbols-outlined text-4xl font-thin text-zen-secondary mb-6 block mx-auto">spa</span>
                        <h2 className="text-3xl md:text-4xl font-zen-display font-light text-zen-900 dark:text-white mb-6 tracking-wide">
                            Join the Circle of Stillness
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 font-light leading-relaxed mb-10">
                            Receive quiet updates on our newest harvests, mindful living tips, and exclusive offers tailored for our community.
                        </p>
                        <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                            <input className="flex-1 bg-transparent border border-zen-200 dark:border-zinc-700 rounded-sm px-4 py-3 text-sm focus:ring-1 focus:ring-zen-secondary focus:border-zen-secondary outline-none dark:text-white font-light placeholder-gray-400" placeholder="Your email address" type="email" />
                            <button className="px-8 py-3 bg-zen-900 dark:bg-white text-white dark:text-zen-900 rounded-sm text-xs uppercase tracking-widest hover:bg-zen-secondary dark:hover:bg-gray-200 transition-colors duration-300" type="submit">
                                Subscribe
                            </button>
                        </form>
                        <p className="text-[10px] text-gray-400 mt-4 tracking-wide">We respect your privacy and inbox peace.</p>
                    </ScrollReveal>
                </section>
            </main>

            <ZenFooter />
        </div>
    );
}
