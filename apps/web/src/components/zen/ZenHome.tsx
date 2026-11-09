'use client';

// import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
// import { useCurrency } from '@/hooks/useCurrency';
import ZenFooter from './ZenFooter';
import ScrollReveal from '../ui/ScrollReveal';
import { Product, Category } from '@/types/product';
import ShopDiscovery from '@/components/shop/ShopDiscovery';
import Image from 'next/image';
import HomeHero from '../traditional/home/HomeHero';
import { AppIcon } from "@/components/icons/AppIcon";

export default function ZenHome({ products, categories = [] }: { products: Product[]; categories?: Category[] }) {
    return (
        <div className="bg-zen-50 dark:bg-zinc-950 font-zen-sans text-zen-800 antialiased selection:bg-zen-secondary selection:text-white">

            <div className="tp-home tp-zen-hero"><HomeHero locale="en" /></div>

            <main className="relative z-10 bg-zen-50 dark:bg-zinc-950">

                <ShopDiscovery products={products} categories={categories} locale="en" />

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
                                        alt="Agarwood sticks and raw wood"
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                                        src="/photos/story-wood.webp"
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
                                        alt="Incense cones beside raw agarwood"
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                                        src="/photos/story-time.webp"
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
                        <AppIcon name="spa" className="text-4xl font-thin text-zen-secondary mb-6 block mx-auto" />
                        <h2 className="text-3xl md:text-4xl font-zen-display font-light text-zen-900 dark:text-white mb-6 tracking-wide">
                            Join the Circle of Stillness
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 font-light leading-relaxed mb-10">
                            Explore stories about Vietnamese agarwood, new collections and mindful rituals.
                        </p>
                        <p className="text-sm leading-relaxed">Newsletter subscriptions are not available yet. Read stories in our journal.</p>
                        <p className="text-[10px] text-gray-400 mt-4 tracking-wide">We respect your privacy and inbox peace.</p>
                    </ScrollReveal>
                </section>
            </main>

            <ZenFooter />
        </div>
    );
}
