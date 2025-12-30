'use client';

import { Link } from '@/i18n/routing';

export default function ZenFooter() {
    return (
        <footer className="bg-zen-100 dark:bg-[#0f0f0f] pt-20 pb-12 border-t border-zen-200 dark:border-zinc-800">
            <div className="max-w-[1600px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
                    <div className="md:col-span-4 lg:col-span-5 pr-8">
                        <Link href="/" className="text-xl tracking-[0.2em] font-zen-display uppercase font-bold text-zen-900 dark:text-white block mb-6">
                            Tram Huong Thien Phuc
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-7 font-zen-sans font-light max-w-sm">
                            Bringing the sacred scent of Vietnamese agarwood to the modern sanctuary. An invitation to pause, breathe, and reconnect.
                        </p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-zen-900 dark:text-white mb-6 font-zen-sans">Shop</h4>
                        <ul className="space-y-4">
                            <li><Link href="/products?category=incense" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Incense</Link></li>
                            <li><Link href="/products?category=bracelets" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Bracelets</Link></li>
                            <li><Link href="/products?category=burners" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Burners</Link></li>
                            <li><Link href="/products?category=gifts" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Gift Sets</Link></li>
                        </ul>
                    </div>
                    <div className="md:col-span-2 lg:col-span-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-zen-900 dark:text-white mb-6 font-zen-sans">About</h4>
                        <ul className="space-y-4">
                            <li><Link href="/about" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Our Story</Link></li>
                            <li><Link href="/blog" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Journal</Link></li>
                            <li><Link href="/sustainability" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Sustainability</Link></li>
                            <li><Link href="/contact" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors uppercase tracking-wide font-light font-zen-sans">Contact</Link></li>
                        </ul>
                    </div>
                    <div className="md:col-span-4 lg:col-span-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-zen-900 dark:text-white mb-6 font-zen-sans">Contact</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-light font-zen-sans">Hue City, Vietnam</p>
                        <a href="mailto:Hoan64735@gmail.com" className="text-xs text-gray-600 dark:text-gray-400 hover:text-zen-secondary transition-colors font-light block font-zen-sans">Hoan64735@gmail.com</a>
                    </div>
                </div>
                <div className="border-t border-zen-200/50 dark:border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-widest text-gray-400 font-light font-zen-sans">
                    <p>© 2024 Tram Huong. All rights reserved.</p>
                    <div className="flex space-x-8 mt-4 md:mt-0">
                        <a href="#" className="hover:text-zen-secondary transition-colors">Instagram</a>
                        <a href="https://www.facebook.com/profile.php?id=61585286954215" className="hover:text-zen-secondary transition-colors">Facebook</a>
                        <a href="#" className="hover:text-zen-secondary transition-colors">Pinterest</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
