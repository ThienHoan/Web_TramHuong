'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/components/providers/CartProvider';
import { useState, useEffect } from 'react';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';

export default function TraditionalProductList({ products }: { products: any[] }) {
    const t = useTranslations('HomePage');
    const { formatPrice } = useCurrency();
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('chuong-1');

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const sections = ['chuong-1', 'chuong-2', 'chuong-3'];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            {
                rootMargin: '-20% 0px -50% 0px', // Trigger when section is near center/top
                threshold: 0.1
            }
        );

        sections.forEach((id) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    // Helper to filter products
    const highEndProducts = products.filter(p => Number(p.price) > 1000000).slice(0, 2);
    // const dailyProducts = products.filter(p => Number(p.price) <= 500000).slice(0, 2); // Unused in original but keeping logic if needed
    // const giftSets = products.filter(p => p.category?.code === 'gift_set').slice(0, 1); // Unused in original

    const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const headerOffset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    return (
        <div className="bg-trad-bg-light font-display text-trad-text-main antialiased selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-trad-bg-warm py-20 lg:py-28 border-b border-trad-border-warm">
                <div className="absolute top-0 left-0 right-0 h-48 z-0 opacity-40 bg-pattern-lotus"></div>
                <div className="container relative z-10 mx-auto px-4 text-center md:px-8 xl:px-20">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-4 flex items-center justify-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <div className="h-px w-12 bg-trad-primary"></div>
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-trad-primary">Tinh Hoa Đất Trời</span>
                            <div className="h-px w-12 bg-trad-primary"></div>
                        </div>
                        <h1 className="mb-8 font-display text-4xl font-bold leading-tight text-trad-red-900 md:text-6xl lg:text-7xl opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            Hành Trình Hương Trầm
                        </h1>
                        <p className="mx-auto max-w-2xl text-lg italic leading-relaxed text-trad-text-main/80 md:text-xl opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                            "Từ những vết thương của cây dó bầu nơi rừng già, thời gian và linh khí đất trời đã hun đúc nên trầm hương quý giá. Mỗi nén hương Thiên Phúc là một câu chuyện về sự chữa lành và an yên."
                        </p>
                        <div className="mt-10 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
                            <span className="material-symbols-outlined animate-bounce text-3xl text-trad-primary/50">keyboard_arrow_down</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sticky Chapter Nav - Adjustment for new header height (80px) */}
            <div className={`sticky top-20 z-40 w-full border-b border-trad-border-warm transition-all duration-300 ${scrolled ? 'bg-trad-bg-light/95 backdrop-blur-md shadow-md py-2' : 'bg-trad-bg-light py-4'}`}>
                <div className="container mx-auto px-4 md:px-8 xl:px-20">
                    <nav className="flex justify-center md:justify-start space-x-2 md:space-x-8 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'chuong-1', label: 'Chương I: Thượng Hạng' },
                            { id: 'chuong-2', label: 'Chương II: An Yên' },
                            { id: 'chuong-3', label: 'Chương III: Tâm Giao' }
                        ].map((item, index) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                onClick={(e) => scrollToSection(e, item.id)}
                                className={`relative px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap group ${activeSection === item.id
                                    ? 'text-trad-primary'
                                    : 'text-trad-text-muted hover:text-trad-primary'
                                    }`}
                            >
                                <span className={`mr-2 ${index === 0 ? 'hidden' : 'inline'} text-trad-border-warm group-hover:text-trad-primary`}>•</span>
                                {item.label}
                                <span className={`absolute bottom-0 left-0 h-0.5 w-full bg-trad-primary transform transition-transform duration-300 ${activeSection === item.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                            </a>
                        ))}
                    </nav>
                </div>
            </div>

            <main>
                {/* Chapter 1 */}
                <section className="relative py-20 lg:py-24 scroll-mt-32" id="chuong-1">
                    <div className="container mx-auto px-4 md:px-8 xl:px-20">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                            <div className="lg:col-span-5 lg:sticky lg:top-48 h-fit">
                                <div className="mb-6 flex items-center gap-2 text-trad-primary">
                                    <span className="material-symbols-outlined">filter_vintage</span>
                                    <span className="text-sm font-bold uppercase tracking-widest">Cao Cấp Nhất</span>
                                </div>
                                <h2 className="mb-6 text-4xl font-bold text-trad-text-main lg:text-5xl">
                                    Nụ Trầm <span className="text-trad-primary italic block mt-2">Thượng Hạng</span>
                                </h2>
                                <div className="prose prose-lg text-trad-text-main/80 mb-8 font-light text-justify">
                                    <p className="first-letter:float-left first-letter:mr-3 first-letter:mt-[-4px] first-letter:text-6xl first-letter:font-bold first-letter:leading-none first-letter:text-trad-primary first-letter:font-display">
                                        Được tuyển chọn từ những phôi trầm có tuổi tích hương trên 15 năm, dòng sản phẩm Thượng Hạng mang hương thơm ngọt sâu, đầm ấm đặc trưng. Không gian thưởng trầm như lắng đọng, đưa tâm trí về trạng thái thiền định sâu sắc nhất.
                                    </p>
                                    <p className="text-base mt-4 italic text-trad-text-muted">
                                        Thích hợp cho không gian thờ cúng trang trọng, bàn trà đạo hoặc quà tặng đối tác cao cấp.
                                    </p>
                                </div>
                                <div className="mt-8 rounded-lg border border-trad-border-warm bg-white p-6 shadow-sm">
                                    <h3 className="mb-3 font-display text-lg font-bold text-trad-text-main">Bạn đang tìm kiếm?</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <button className="rounded-full border border-trad-primary bg-trad-primary px-4 py-1.5 text-xs font-bold text-white transition-colors">Tất cả</button>
                                        <button className="rounded-full border border-trad-border-warm bg-transparent px-4 py-1.5 text-xs font-bold text-trad-text-muted hover:border-trad-primary hover:text-trad-primary transition-colors">Hộp gỗ</button>
                                        <button className="rounded-full border border-trad-border-warm bg-transparent px-4 py-1.5 text-xs font-bold text-trad-text-muted hover:border-trad-primary hover:text-trad-primary transition-colors">Hộp giấy</button>
                                        <button className="rounded-full border border-trad-border-warm bg-transparent px-4 py-1.5 text-xs font-bold text-trad-text-muted hover:border-trad-primary hover:text-trad-primary transition-colors">Nụ tháp</button>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-7">
                                <div className="grid gap-8 sm:grid-cols-2">
                                    {/* Mock Products/Real Products Mapping */}
                                    {highEndProducts.length > 0 ? highEndProducts.map((product) => (
                                        <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-md bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-trad-border-warm">
                                            <div className="relative aspect-[4/5] overflow-hidden bg-trad-bg-warm">
                                                <ProductImage
                                                    src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                                                    alt={product.translation?.title}
                                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                                    <Link href={`/products/${product.slug}`}>
                                                        <button className="w-full rounded bg-white py-3 text-xs font-bold uppercase tracking-widest text-trad-text-main shadow-lg hover:bg-trad-primary hover:text-white transition-colors">
                                                            Thêm vào giỏ
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="flex flex-1 flex-col p-5">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-trad-text-muted">Hộp gỗ sơn mài</span>
                                                    <div className="flex text-trad-primary">
                                                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                                                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                                                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                                                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                                                        <span className="material-symbols-outlined text-[14px] filled">star</span>
                                                    </div>
                                                </div>
                                                <h3 className="font-display text-lg font-bold text-trad-text-main hover:text-trad-primary transition-colors">
                                                    <Link href={`/products/${product.slug}`}>{product.translation?.title}</Link>
                                                </h3>
                                                <div className="mt-auto pt-4 flex items-baseline gap-2">
                                                    <span className="text-lg font-bold text-trad-primary">{formatPrice(product.price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        // Fallback if no products
                                        <div className="group relative flex flex-col overflow-hidden rounded-md bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-trad-border-warm">
                                            {/* ... Static HTML fallback/mock from original file ... */}
                                            <div className="relative aspect-[4/5] overflow-hidden bg-trad-bg-warm">
                                                <img alt="Hộp Nụ Trầm Cao Cấp" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-10 flex justify-center">
                                    <Link className="inline-flex items-center justify-center rounded-sm border border-trad-primary px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-trad-primary transition-all hover:bg-trad-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-trad-primary focus:ring-offset-2 group" href="/products/catalog">
                                        Xem tất cả sản phẩm
                                        <span className="material-symbols-outlined ml-2 text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Chapter 2 Divider */}
                <div className="relative h-64 w-full bg-fixed bg-center bg-cover flex items-center justify-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA53Ox39qBj5FKKQEZ3-qcETM9i39kEbUZT9Ynxi9nZXdV7h4KyLsGNrye5hur-9UYFhigs1i88IYbe_7ITlciEDyQtDqCt_6jMfm8bB-bcz-Bok2HRENwXpziMTSxvgkKinp1xXpLvRxBvcOUM0TXTMmzqPzDf7-pXLfglXt_NiFjfaG2hIDYvLw54kCZ-XR1RXvfs5RKE26OizUGUZc4xhXFHZ6D_iv6jTV1kz9Hv0L117p4mnPyak6oeyuTEmxu_tMTKCqXWwmre')" }}>
                    <div className="absolute inset-0 bg-black/40"></div>
                    <div className="relative z-10 text-center text-white px-4">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-80">self_improvement</span>
                        <p className="font-display text-2xl md:text-3xl italic font-medium">"Hương trầm tỏa ra, phiền muộn tan biến."</p>
                    </div>
                </div>

                {/* Chapter 2: The Daily Ritual */}
                <section className="relative py-32 bg-fixed bg-cover bg-center" id="chuong-2" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1528351655744-142279b94689?q=80&w=2574&auto=format&fit=crop')" }}>
                    <div className="absolute inset-0 bg-stone-900/10 backdrop-blur-[1px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-trad-bg-warm/90 via-trad-bg-warm/40 to-trad-bg-warm/80"></div>

                    <div className="container mx-auto px-4 md:px-8 xl:px-20 relative z-10">
                        <div className="text-center mb-20">
                            <span className="font-display text-5xl text-trad-primary/30 block mb-4">II</span>
                            <h2 className="font-display text-4xl md:text-5xl font-bold text-trad-red-900 mb-6 drop-shadow-sm">Nghi Thức An Yên</h2>
                            <p className="text-xl text-trad-text-main/80 font-medium italic max-w-2xl mx-auto leading-relaxed">
                                "Trầm hương không chỉ là mùi hương, mà là người bạn đồng hành trong từng khoảnh khắc sống. Để mỗi sáng mai thức dậy là một khởi đầu thanh khiết, và mỗi tối trở về là sự buông bỏ muộn phiền."
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
                            {/* Morning Ritual */}
                            <div className="group relative bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl hover:shadow-2xl hover:bg-white/90 transition-all duration-500">
                                <div className="absolute -top-6 -left-6 bg-gradient-to-br from-trad-primary to-orange-600 text-white p-4 rounded-xl shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">wb_twilight</span>
                                </div>
                                <h3 className="font-display text-3xl font-bold text-trad-red-900 mb-4 mt-6">Khởi Đầu Ngày Mới</h3>
                                <p className="text-trad-text-main/80 mb-8 leading-relaxed font-medium">
                                    Một nén trầm không tăm bên tách trà sớm. Hương thơm nhẹ nhàng đánh thức mọi giác quan, thanh lọc không gian để đón chào năng lượng mới.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 bg-trad-bg-warm p-4 rounded-lg hover:bg-white border border-trad-border-warm transition-all cursor-pointer shadow-sm">
                                        <div className="h-16 w-16 rounded bg-white flex-shrink-0 border border-trad-border-warm">
                                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJXdbsle4XugPy2GHLlKjLV9fVmNMbUg8sc0_axXBHWzw9t_Sf05V0la94sPA_cryAD92fxpiVjee14rdLoemCrS-47ehv-plnpgRrUYk_i8-ROHaKOFVHokQo6T7QEJQf9FGh61Pfg_HJZ5IKPhxWH7B2ZG_sjFUrWtfd3zBpa-Qw_SoqyJvgh39JZO-2E0A38QZI8bRyvbjlIk3MiamFFK-hsOVPVkp_Bw5EchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg" alt="Nụ Trầm" className="h-full w-full object-cover rounded" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-trad-text-main">Nụ Trầm Loại 1</h4>
                                            <p className="text-sm text-trad-text-muted">Hương dịu ngọt, cháy 15 phút</p>
                                            <span className="text-trad-primary font-bold text-sm">350.000 ₫</span>
                                        </div>
                                        <button className="ml-auto bg-trad-bg-light hover:bg-trad-primary text-trad-primary hover:text-white rounded-full p-2 transition-colors border border-trad-primary/20">
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 bg-trad-bg-warm p-4 rounded-lg hover:bg-white border border-trad-border-warm transition-all cursor-pointer shadow-sm">
                                        <div className="h-16 w-16 rounded bg-white flex-shrink-0 border border-trad-border-warm">
                                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg" alt="Nhang Không Tăm" className="h-full w-full object-cover rounded" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-trad-text-main">Nhang Không Tăm</h4>
                                            <p className="text-sm text-trad-text-muted">Tinh tế, không tàn rơi</p>
                                            <span className="text-trad-primary font-bold text-sm">450.000 ₫</span>
                                        </div>
                                        <button className="ml-auto bg-trad-bg-light hover:bg-trad-primary text-trad-primary hover:text-white rounded-full p-2 transition-colors border border-trad-primary/20">
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Evening Ritual */}
                            <div className="group relative bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/40 shadow-xl hover:shadow-2xl hover:bg-white/90 transition-all duration-500 mt-12 lg:mt-0">
                                <div className="absolute -top-6 -right-6 bg-trad-red-900 text-amber-100 p-4 rounded-xl shadow-lg -rotate-3 group-hover:rotate-0 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">nights_stay</span>
                                </div>
                                <h3 className="font-display text-3xl font-bold text-trad-red-900 mb-4 mt-6 text-right">Về Lại An Yên</h3>
                                <p className="text-trad-text-main/80 mb-8 leading-relaxed text-right font-medium">
                                    Sau một ngày dài, đốt một khoanh hương vòng. Mọi ồn ào khép lại sau cánh cửa, chỉ còn lại sự tĩnh tại để tâm hồn được nghỉ ngơi.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 bg-trad-bg-warm p-4 rounded-lg hover:bg-white border border-trad-border-warm transition-all cursor-pointer flex-row-reverse text-right shadow-sm">
                                        <div className="h-16 w-16 rounded bg-white flex-shrink-0 border border-trad-border-warm">
                                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg" alt="Nhang Vòng" className="h-full w-full object-cover rounded" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-trad-text-main">Nhang Vòng 24h</h4>
                                            <p className="text-sm text-trad-text-muted">Cháy liên tục, ấm áp</p>
                                            <span className="text-trad-primary font-bold text-sm">280.000 ₫</span>
                                        </div>
                                        <button className="mr-auto bg-trad-bg-light hover:bg-trad-primary text-trad-primary hover:text-white rounded-full p-2 transition-colors border border-trad-primary/20">
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 bg-trad-bg-warm p-4 rounded-lg hover:bg-white border border-trad-border-warm transition-all cursor-pointer flex-row-reverse text-right shadow-sm">
                                        <div className="h-16 w-16 rounded bg-white flex-shrink-0 border border-trad-border-warm">
                                            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmLQp5pT5Y-cAkmxjCSjmiemDGOkD2xraiLcWSu4-BOzzp0baxiZSzRW-VBQWker0mQv25uem3U89YDE-PhDD_FmiIuxKdjQUPb9Qe9a188t2vqposa6njiyRntMMSo6Yq947ZjlujmFwbk_Tnw1qXUx0ZQNNYxbdSJJqGomqVdll0kMndDl8dDiKMk643X4e7pd2rKzFvePMAZpv_fKfYBCoyZCPbevp4ksM_AHHb4j7coG5fGIC9ggvwrnIdBsSX_pkfqLnWXnmf" alt="Combo" className="h-full w-full object-cover rounded" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-trad-text-main">Combo Thư Giãn</h4>
                                            <p className="text-sm text-trad-text-muted">Đầy đủ dụng cụ xông</p>
                                            <span className="text-trad-primary font-bold text-sm">550.000 ₫</span>
                                        </div>
                                        <button className="mr-auto bg-trad-bg-light hover:bg-trad-primary text-trad-primary hover:text-white rounded-full p-2 transition-colors border border-trad-primary/20">
                                            <span className="material-symbols-outlined text-sm">add</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Chapter 3: Premium Gifting */}
                <section className="bg-trad-red-900 text-trad-bg-light py-24 lg:py-32 scroll-mt-20 relative overflow-hidden" id="chuong-3">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20"></div>
                    <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-black/20 to-transparent"></div>

                    <div className="container mx-auto px-4 md:px-8 xl:px-20 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4 border-b border-white/10 pb-6">
                            <div>
                                <span className="font-display text-5xl text-white/20 block mb-2">III</span>
                                <h2 className="text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">Tâm Giao Gửi Trao</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-white/60 italic max-w-sm ml-auto">"Món quà quý không nằm ở giá trị vật chất, mà ở tấm lòng và sự tinh tế của người trao."</p>
                            </div>
                        </div>

                        {/* Hero Gift Set Spotlight */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-stone-800 rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-16">
                            <div className="relative min-h-[400px] lg:min-h-full">
                                <img alt="Premium Gift Set" className="absolute inset-0 h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA53Ox39qBj5FKKQEZ3-qcETM9i39kEbUZT9Ynxi9nZXdV7h4KyLsGNrye5hur-9UYFhigs1i88IYbe_7ITlciEDyQtDqCt_6jMfm8bB-bcz-Bok2HRENwXpziMTSxvgkKinp1xXpLvRxBvcOUM0TXTMmzqPzDf7-pXLfglXt_NiFjfaG2hIDYvLw54kCZ-XR1RXvfs5RKE26OizUGUZc4xhXFHZ6D_iv6jTV1kz9Hv0L117p4mnPyak6oeyuTEmxu_tMTKCqXWwmre" />
                                <div className="absolute inset-0 bg-gradient-to-r from-stone-900/80 via-transparent to-transparent lg:hidden"></div>
                            </div>
                            <div className="p-10 lg:p-16 flex flex-col justify-center">
                                <div className="inline-block px-3 py-1 bg-amber-900/50 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-widest mb-6 w-fit">
                                    Phiên Bản Giới Hạn Tết 2024
                                </div>
                                <h3 className="font-display text-4xl lg:text-5xl font-bold text-amber-100 mb-6">Set Quà Tâm An</h3>
                                <p className="text-white/70 text-lg leading-relaxed mb-8 font-light">
                                    Tuyệt phẩm quà tặng kết hợp giữa hương trầm thượng hạng và gốm sứ thủ công. Món quà hoàn hảo để gửi trao tấm chân tình đến đối tác và người thân yêu.
                                </p>

                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center gap-4 text-white/80 border-b border-white/10 pb-3">
                                        <span className="material-symbols-outlined text-amber-500 text-xl">deployed_code</span>
                                        <span className="font-medium">Hộp sơn mài thủ công cao cấp</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-white/80 border-b border-white/10 pb-3">
                                        <span className="material-symbols-outlined text-amber-500 text-xl">local_fire_department</span>
                                        <span className="font-medium">Hộp Nụ Trầm Hương 15 năm (50 nụ)</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-white/80 border-b border-white/10 pb-3">
                                        <span className="material-symbols-outlined text-amber-500 text-xl">filter_vintage</span>
                                        <span className="font-medium">Lư xông gốm men rạn Bát Tràng</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-3xl font-bold text-amber-400">890.000 ₫</div>
                                    <button className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-900/50 transition-all transform hover:-translate-y-1">
                                        ĐẶT MUA NGAY
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Smaller Gift Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {['Set Bình An', 'Set Phú Quý', 'Set Lộc Phát'].map((name, i) => (
                                <div key={i} className="group bg-stone-800 rounded-xl p-6 border border-white/5 hover:border-amber-500/30 transition-all hover:bg-stone-750 cursor-pointer">
                                    <div className="h-48 rounded-lg overflow-hidden bg-stone-900 mb-4 relative">
                                        <div className="absolute inset-0 bg-stone-700 animate-pulse"></div>
                                        {/* Placeholder for real images */}
                                        <img src={`https://source.unsplash.com/random/400x300?gift,incense,${i}`} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={name} />
                                    </div>
                                    <h4 className="text-xl font-display font-bold text-white group-hover:text-amber-400 transition-colors mb-2">{name}</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/60 text-sm">Hộp quà tiêu chuẩn</span>
                                        <span className="text-amber-400 font-bold">Từ 450.000 ₫</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Newsletter */}
                <section className="relative overflow-hidden bg-trad-red-900 py-16 text-center text-white">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-10"></div>
                    <div className="container relative z-10 mx-auto px-4">
                        <span className="material-symbols-outlined mb-4 text-5xl opacity-80">mark_email_unread</span>
                        <h2 className="mb-4 font-display text-3xl font-bold">Thư Hương Từ Thiên Phúc</h2>
                        <p className="mx-auto mb-8 max-w-lg text-trad-bg-light/80">
                            Đăng ký để nhận những câu chuyện về Trầm Hương và ưu đãi dành riêng cho khách hàng thân thiết.
                        </p>
                        <form className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
                            <input className="flex-1 rounded border-0 bg-white/10 px-4 py-3 text-white placeholder:text-white/60 focus:bg-white focus:text-trad-text-main focus:ring-2 focus:ring-trad-primary outline-none transition-colors" placeholder="Email của bạn..." required type="email" />
                            <button className="rounded bg-trad-primary px-8 py-3 font-bold text-white shadow-lg hover:bg-trad-primary-dark hover:text-white transition-colors" type="submit">ĐĂNG KÝ</button>
                        </form>
                    </div>
                </section>
            </main>

            <TraditionalFooter />
        </div>
    );
}
