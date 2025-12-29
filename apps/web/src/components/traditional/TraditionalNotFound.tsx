'use client';

import { Link } from '@/i18n/routing';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

export default function TraditionalNotFound() {
    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased min-h-screen flex flex-col selection:bg-trad-primary selection:text-white overflow-hidden transition-colors duration-300">
            <TraditionalHeader />

            <main className="flex-grow flex items-center justify-center relative p-4 md:p-8">
                {/* Background Decorative Elements */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] dark:invert"></div>

                {/* Floating Elements mimicking smoke/clouds */}
                <div className="absolute top-20 left-10 w-64 h-64 bg-trad-primary/5 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute bottom-20 right-10 w-80 h-80 bg-trad-amber-100/30 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: '2s' }}></div>

                <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
                    {/* Illustration Side */}
                    <div className="relative order-2 lg:order-1 flex justify-center">
                        <div className="relative w-full aspect-[4/5] max-w-md lg:max-w-full rounded-t-full rounded-b-xl overflow-hidden shadow-2xl ring-1 ring-trad-primary/20 bg-[#fbf6f0]">
                            {/* Main Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-90 transition-transform duration-[20s] hover:scale-105"
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDJc0juf6o_JSIAoduZrGN_gGXJRUSFqiPRqEdVGvAaNQqeKZ2KBsPbBWRcGPrDmg_nEuQXEoqMTLQ94g7n9TqxN4t3spUEL0dNLMCMI234drkrXxlWxqiHyul1oy0cJGCFZGDRKCEBREen5P9gMqcum8NXRcgOwYmDdjaT8MloyLL7fU6RKMHbnXyeXJbBhKnOBw1jEl8Ld9j5vUtaul-vNsRHMrPn4ocT7Hbf3eKGlK4O4r1nWPTv8HRA-uqA-1I9FaNCRqvGOIVn')" }}
                            >
                            </div>
                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-trad-bg-light via-transparent to-transparent"></div>

                            {/* 404 Text Integrated */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                                <h1 className="text-[120px] leading-none font-display font-black text-white/20 select-none mix-blend-overlay">404</h1>
                            </div>

                            {/* Stylized Cloud SVG overlay at bottom */}
                            <div className="absolute bottom-0 w-full text-trad-bg-light">
                                <svg className="w-full h-auto block" preserveAspectRatio="none" viewBox="0 0 1440 320">
                                    <path d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" fill="currentColor" fillOpacity="1"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="flex flex-col gap-8 text-center lg:text-left order-1 lg:order-2">
                        <div className="space-y-4">
                            <span className="inline-block px-3 py-1 rounded-full bg-trad-primary/10 text-trad-primary text-xs font-bold tracking-widest uppercase mb-2 border border-trad-primary/20">
                                Lỗi trang 404
                            </span>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-trad-text-main leading-[1.15] tracking-tight">
                                Lạc lối giữa <span className="text-trad-primary italic font-serif">hương trầm?</span>
                            </h1>
                        </div>
                        <div className="space-y-4 max-w-lg mx-auto lg:mx-0">
                            <p className="text-lg md:text-xl text-trad-text-main/80 font-light leading-relaxed">
                                Đừng lo, những tinh hoa vẫn đang chờ bạn khám phá. Hãy để hương thơm dẫn lối bạn về lại chốn an yên.
                            </p>
                            <p className="text-sm text-trad-text-muted italic">
                                "Con đường hương thơm tạm thời không tìm thấy..."
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <Link href="/" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-trad-primary text-white text-base font-bold transition-all hover:bg-trad-red-900 hover:shadow-lg hover:shadow-trad-primary/30 active:scale-95 group">
                                <span>Quay về Trang chủ</span>
                                <span className="material-symbols-outlined ml-2 text-[20px] transition-transform group-hover:-translate-x-1">west</span>
                            </Link>
                            <Link href="/products" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-transparent border-2 border-trad-primary/30 text-trad-text-main text-base font-bold transition-all hover:border-trad-primary hover:bg-trad-primary/5 active:scale-95 group">
                                <span className="material-symbols-outlined mr-2 text-[20px] text-trad-primary transition-transform group-hover:rotate-12">spa</span>
                                <span>Khám phá Sản phẩm</span>
                            </Link>
                        </div>

                        {/* Quick Links */}
                        <div className="pt-8 border-t border-dashed border-trad-border-warm mt-4">
                            <p className="text-sm font-bold text-trad-text-muted mb-3 uppercase tracking-wider text-center lg:text-left">Có thể bạn đang tìm:</p>
                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                                <Link href="/products?category=nu-tram" className="px-4 py-2 rounded-lg bg-white shadow-sm border border-trad-border-warm hover:border-trad-primary/50 text-sm transition-colors text-trad-text-main hover:text-trad-primary">Nụ trầm hương</Link>
                                <Link href="/products?category=vong-tram" className="px-4 py-2 rounded-lg bg-white shadow-sm border border-trad-border-warm hover:border-trad-primary/50 text-sm transition-colors text-trad-text-main hover:text-trad-primary">Vòng tay trầm</Link>
                                <Link href="/products?category=lu-xong" className="px-4 py-2 rounded-lg bg-white shadow-sm border border-trad-border-warm hover:border-trad-primary/50 text-sm transition-colors text-trad-text-main hover:text-trad-primary">Lư xông trầm</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <TraditionalFooter />
        </div>
    );
}
