'use client';

import { Link } from '@/i18n/routing';

export default function ZenNotFound() {
    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main dark:text-white font-display antialiased transition-colors duration-300 min-h-screen flex flex-col">
            <header className="flex items-center justify-between whitespace-nowrap px-10 py-6 absolute top-0 w-full z-10 bg-transparent">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-4 text-text-main dark:text-white group transition-opacity hover:opacity-80">
                        <div className="size-6 text-primary">
                            <span className="material-symbols-outlined !text-[24px]">spa</span>
                        </div>
                        <h2 className="text-base font-bold tracking-widest text-text-main dark:text-white">ZEN INCENSE</h2>
                    </Link>
                </div>
                <div className="hidden md:flex items-center gap-9">
                    <Link href="/" className="text-text-main dark:text-gray-300 text-xs tracking-[0.2em] font-medium hover:text-primary transition-colors">SHOP</Link>
                    <Link href="/" className="text-text-main dark:text-gray-300 text-xs tracking-[0.2em] font-medium hover:text-primary transition-colors">COLLECTIONS</Link>
                    <Link href="/" className="text-text-main dark:text-gray-300 text-xs tracking-[0.2em] font-medium hover:text-primary transition-colors">JOURNAL</Link>
                </div>
                <div className="flex items-center gap-4">
                    <button className="text-text-main dark:text-white hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-2xl">search</span>
                    </button>
                    <button className="text-text-main dark:text-white hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area: Centered, Calm, Spacious */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 min-h-screen relative animate-fade-in">
                {/* Abstract Background Decoration */}
                <div className="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden flex items-center justify-center">
                    <div className="w-[800px] h-[800px] rounded-full border-[1px] border-primary/10"></div>
                    <div className="absolute w-[600px] h-[600px] rounded-full border-[1px] border-primary/10"></div>
                    <div className="absolute w-[400px] h-[400px] rounded-full border-[1px] border-primary/20"></div>
                </div>

                {/* Content Container */}
                <div className="z-10 flex flex-col items-center max-w-3xl text-center gap-10">
                    {/* Main Visual: Minimalist Iconography */}
                    <div className="mb-6 relative">
                        <div className="flex items-center justify-center">
                            {/* Abstract leaf/smoke symbol using material icon as placeholder for SVG path if preferred, or the SVG from request */}
                            <svg className="text-text-main dark:text-gray-200 opacity-80" fill="none" height="180" viewBox="0 0 120 180" width="120" xmlns="http://www.w3.org/2000/svg">
                                <path className="opacity-50" d="M60 0C60 0 80 40 80 90C80 140 60 180 60 180C60 180 40 140 40 90C40 40 60 0 60 0Z" stroke="currentColor" strokeWidth="1.5"></path>
                                <path className="opacity-40" d="M60 20C60 20 20 60 20 90C20 120 60 160 60 160" stroke="currentColor" strokeWidth="1"></path>
                                <path className="opacity-60" d="M60 40C60 40 90 70 90 90C90 110 60 140 60 140" stroke="currentColor" strokeWidth="0.5"></path>
                                {/* A line diverging away */}
                                <path d="M60 90C60 90 90 80 110 60" stroke="#54ae13" strokeDasharray="4 4" strokeWidth="1.5"></path>
                            </svg>
                        </div>
                    </div>

                    {/* Text Block */}
                    <div className="space-y-6">
                        <h1 className="text-3xl md:text-5xl font-thin tracking-[0.2em] text-text-main dark:text-white uppercase leading-relaxed">
                            The Path Diverged
                        </h1>
                        <div className="h-px w-16 bg-primary/40 mx-auto my-4"></div>
                        <p className="text-sm md:text-base font-light tracking-widest text-text-main/70 dark:text-gray-300/70 uppercase max-w-lg mx-auto leading-loose">
                            Lost in thought. The essence remains.<br />Let us guide you back to tranquility.
                        </p>
                    </div>

                    {/* Call to Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-5 mt-8 w-full justify-center">
                        <Link href="/" className="group relative flex items-center justify-center min-w-[240px] px-8 py-3 bg-text-main dark:bg-gray-200 text-white dark:text-text-main text-xs font-light tracking-[0.2em] uppercase rounded-md overflow-hidden transition-all hover:bg-primary dark:hover:bg-primary hover:text-white dark:hover:text-white shadow-sm hover:shadow-md">
                            <span className="relative z-10">Return to Homepage</span>
                        </Link>
                        <Link href="/" className="group relative flex items-center justify-center min-w-[240px] px-8 py-3 bg-transparent border border-text-main/30 dark:border-gray-200/30 text-text-main dark:text-gray-200 text-xs font-light tracking-[0.2em] uppercase rounded-md transition-all hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary">
                            <span>Explore Collections</span>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Minimal Footer */}
            <footer className="w-full py-8 text-center border-t border-surface-light dark:border-white/5 bg-background-light dark:bg-background-dark z-10">
                <div className="flex flex-col gap-6 px-5">
                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                        <a className="text-text-main/60 dark:text-gray-400/60 text-xs font-light tracking-widest hover:text-primary transition-colors" href="#">CONTACT</a>
                        <a className="text-text-main/60 dark:text-gray-400/60 text-xs font-light tracking-widest hover:text-primary transition-colors" href="#">SHIPPING</a>
                        <a className="text-text-main/60 dark:text-gray-400/60 text-xs font-light tracking-widest hover:text-primary transition-colors" href="#">RETURNS</a>
                    </div>
                    <p className="text-text-main/40 dark:text-gray-400/40 text-[10px] tracking-widest uppercase">© 2024 Zen Incense. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
