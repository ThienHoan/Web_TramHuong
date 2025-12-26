'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import ProductImage from '../ui/ProductImage';
import { useCurrency } from '@/hooks/useCurrency';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';

export default function TraditionalHome({ products }: { products: any[] }) {
    const t = useTranslations('HomePage');
    const { formatPrice } = useCurrency();

    const flashSaleProducts = products.slice(0, 4);
    const featuredProducts = products.slice(0, 8);

    return (
        <div className="bg-brand-yellow font-display text-text-main antialiased selection:bg-primary selection:text-white bg-pattern-lotus flex flex-col min-h-screen">
            {/* Live Chat Button */}
            <a className="fixed bottom-8 right-6 z-50 group" href="#">
                <div className="relative flex items-center justify-center size-14 bg-gradient-to-br from-[#0068FF] to-[#0041a3] text-white rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 ring-4 ring-white/30">
                    <span className="material-symbols-outlined text-3xl">chat</span>
                    <span className="absolute right-0 top-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </div>
            </a>

            <TraditionalHeader />

            <main className="flex-1 overflow-x-hidden">
                {/* Hero Section */}
                <section className="relative w-full overflow-hidden bg-background-dark min-h-[85vh] flex items-center">
                    <div className="absolute inset-0 z-0">
                        <img alt="Background texture" className="h-full w-full object-cover opacity-60 mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTEhF6nYXUFQqme420x-8MjtH4uUg24dfEfHSdpSP-reCtR3k0ktxMrYVMWSisJwTHSr4IVwO_fshPCDxWX7XRypxRJNzU8M6BINOB_CjlV_0YLl4IgIR57eCpTIgReMORytWY9nWG22p_SgzALhYR2vFAJbY70G0JSEx6P7WFjJuvebfR3BTWlnCnsttcbZl6zVv3l1aZHhQ1F_oFISyKamvxcneSZBdgter7YNQ-Baj0A5nEsg6VI3o0ZY7d1e8VHTL9EDzIU-rW" />
                        <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/80 to-transparent"></div>
                    </div>
                    <div className="container mx-auto px-4 xl:px-8 relative z-10 py-12">
                        <div className="grid lg:grid-cols-12 gap-12 items-center">
                            <div className="lg:col-span-5 space-y-8 animate-fade-in-up">
                                <div className="inline-flex items-center gap-2 mb-2">
                                    <div className="h-[1px] w-8 bg-accent-gold"></div>
                                    <span className="text-accent-gold uppercase tracking-[0.3em] text-xs font-bold">Chương mở đầu</span>
                                </div>
                                <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-white">
                                    Hương Của<br />
                                    <span className="text-accent-gold italic font-light">Đất Trời</span>
                                </h2>
                                <p className="text-lg text-white/90 font-normal leading-relaxed">
                                    Từ những vết thương trên thân cây Dó Bầu, qua chục năm dãi dầu mưa nắng, kết tinh thành giọt máu của rừng già. Trầm hương Thiên Phúc - Nơi kể lại câu chuyện về mùi hương của sự bình an.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <Link href="/products">
                                        <button className="group inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-white shadow-lg transition-all hover:bg-primary-dark border border-primary">
                                            <span>Khám Phá Ngay</span>
                                            <span className="material-symbols-outlined ml-2 text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </button>
                                    </Link>
                                </div>
                            </div>
                            <div className="lg:col-span-7 relative h-[500px] lg:h-[600px] flex items-center justify-center">
                                <div className="absolute w-[90%] h-[90%] border border-white/5 rounded-full animate-spin duration-[20s]"></div>
                                <div className="absolute w-[70%] h-[70%] border border-accent-gold/20 rounded-full"></div>
                                <div className="relative z-10 w-[320px] md:w-[400px]">
                                    <div className="absolute -inset-4 bg-accent-gold/20 blur-3xl rounded-full opacity-50"></div>
                                    <img alt="Premium Agarwood Box" className="relative z-10 w-full h-auto object-cover drop-shadow-2xl transform hover:-translate-y-4 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3_PiQCS8QGvrIj99N-j3jeC831CFiaHuU8_BnFOqJSxKLbQpSZQx2w0BNwqIP1rXpa0D3HIWZCkHpgS3GpT7eFCspZIhtXde8F5GDBDroYLZb-_7H_uRR9pP3QnyUbEl3OOrlhcdiQM5vFvoX0d2iHzZHD0FMh7N9up-J0EIrGM1FZe8zqXVNQOCnieBPFJpK6AjtqBiEFLUFWMsLJkMFw4Ci6leh7XKdmvbfb_Cj5JRzPVV_Rs917e_ClSWqpZLfFQPNCrNcT49N" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trust Badges */}
                <section className="py-20 bg-surface/40 backdrop-blur-sm relative border-y border-white/40 overflow-hidden">
                    <img alt="Tranh lụa đầm sen" className="absolute bottom-0 left-0 w-full h-1/2 object-cover opacity-10 silk-illustration -z-10 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAj4ywAY_SNbWBWQAt5eGgpw3AG2SnP2ugzjqFP1holMWncOh3F5NAIu0ERClJIeEAJO_IT3ljnj3jo8ZXjpzQBpX1W4pYLFM8b6IBAUIY10Z_TxAmgzlKbSPacUGea1fL8Mgt4Ta6-NY8wSCUk_HTINo7Dv5U0iCq8O-pVCTXJyzxtEuF2tQ3czQhv6ypDNvkXRvjhoUPlTQVbmtmnKJEtwhn3-Dr8skRJ2dCmUa1ZwOYLifaZp-hHtmkDxWWq53pjUT9d-zKM9GRY" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-accent-gold/40 to-transparent lg:block hidden"></div>
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-text-main mb-4">Cam Kết Từ Tâm</h2>
                            <p className="text-text-sub font-semibold text-lg">
                                Chúng tôi không chỉ bán sản phẩm, chúng tôi trao gửi sự an tâm và tín ngưỡng thờ cúng thiêng liêng.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                            <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30">
                                <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                    <span className="material-symbols-outlined text-3xl">local_florist</span>
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-text-main">100% Tự Nhiên</h3>
                                <p className="text-sm text-text-sub font-semibold">Nguyên liệu sạch, không hóa chất độc hại, an toàn cho sức khỏe.</p>
                            </div>
                            <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30">
                                <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                    <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-text-main">Chất Lượng Đỉnh Cao</h3>
                                <p className="text-sm text-text-sub font-semibold">Quy trình kiểm định nghiêm ngặt, giữ trọn mùi hương nguyên bản.</p>
                            </div>
                            <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30">
                                <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                    <span className="material-symbols-outlined text-3xl">history_edu</span>
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-text-main">Di Sản 10 Năm</h3>
                                <p className="text-sm text-text-sub font-semibold">Kinh nghiệm chế tác trầm hương gia truyền, uy tín bền vững.</p>
                            </div>
                            <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30">
                                <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                    <span className="material-symbols-outlined text-3xl">sentiment_satisfied</span>
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-text-main">Hậu Mãi Tận Tâm</h3>
                                <p className="text-sm text-text-sub font-semibold">Tư vấn đúng nhu cầu, đổi trả linh hoạt, đồng hành trọn đời.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Collection Section */}
                <section className="py-20 lg:py-24 relative" id="collection">
                    <img alt="Họa tiết cuộn thư" className="hidden xl:block absolute top-1/2 -translate-y-1/2 left-0 w-24 opacity-30 mix-blend-multiply silk-illustration" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTZTOm2b961Nkr-mdubbi08OgTgVUP12bdFu780qdmTi6hxqypZZiIBCCRwEXpeRYHAxMCpBvNlEU3eAPPOm8YWEBeWraAlvVPONXA6WPRgZ4rS-qGcjAKpv_RXgw5HL4CGUn_5WIw0GDXojGpPts7F5SxKVFfkNT893aKIyHX9O2k6FtMOYI8mqNevXNhTfhC2FbGZfOjjLn0MDA17rxB0I1ixGuOFa1aCRvi5JQqIl6p714U9BkbhWiB8RmVhcAl7rRL2VUZ_5k0" />
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                            <div>
                                <span className="text-accent-gold-dark font-bold tracking-widest text-sm uppercase block mb-2">Bộ Sưu Tập</span>
                                <h2 className="font-serif text-4xl lg:text-5xl font-bold text-text-main">Không Gian Trầm</h2>
                            </div>
                            <p className="md:max-w-md text-text-main font-semibold text-right md:text-left text-lg">
                                Mỗi không gian, một câu chuyện. Hãy để hương trầm dẫn lối cảm xúc của bạn.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-[300px]">
                            <div className="lg:col-span-8 lg:row-span-2 relative group overflow-hidden rounded-2xl shadow-lg cursor-pointer border border-white/20">
                                <img alt="Thưởng Trầm Nghệ Thuật" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFQAJQ8CHWk4K1rLNZis7NU5TCjdTgej1LW0BY_W3udpP6I5ECvaXhqwGjt27vlvwkKQw27QGtaYVbmEi8JLnbdDbpflfjBwyRRFIheFX6duevY4tEeBAQjhiJaBLRtgIYCbJrE62U-k8rMKF6txndgCYnf6A0wS0ueAmdpFC0mZTPHwZpOhrnxV06i0NBxuqWbMCSSJ1PshSGR2SBdFm_7wUgYimVe71dpZPDCorf5JGn9Wae2i_a_NSaZ7K1z810psbyadlT0z6S" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-8 lg:p-12 w-full">
                                    <span className="text-accent-gold text-sm font-bold uppercase tracking-wider mb-2 block transform translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">Nghệ Thuật Sống</span>
                                    <h3 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-4 drop-shadow-md">Thưởng Trầm Đạo</h3>
                                    <p className="text-white/90 font-medium max-w-lg mb-6 line-clamp-2 md:line-clamp-none drop-shadow-sm">Dụng cụ thưởng trầm tinh xảo, đưa bạn vào trạng thái thiền định sâu lắng nhất.</p>
                                    <span className="inline-flex items-center gap-2 text-white font-bold border-b border-white pb-1 group-hover:border-accent-gold group-hover:text-accent-gold transition-colors">Xem chi tiết <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span></span>
                                </div>
                            </div>
                            <div className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl shadow-lg cursor-pointer border border-white/20">
                                <img alt="Nụ Trầm Hương" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJXdbsle4XugPy2GHLlKjLV9fVmNMbUg8sc0_axXBHWzw9t_Sf05V0la94sPA_cryAD92fxpiVjee14rdLoemCrS-47ehv-plnpgRrUYk_i8-ROHaKOFVHokQo6T7QEJQf9FGh61Pfg_HJZ5IKPhxWH7B2ZG_sjFUrWtfd3zBpa-Qw_SoqyJvgh39JZO-2E0A38QZI8bRyvbjlIk3MiamFFK-hsOVPVkp_Bw5EFCcdTsNbubUJKaNyiDyfeYQPCaszEJEXcLj3Ougl" />
                                <div className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors"></div>
                                <div className="absolute inset-0 flex flex-col justify-end p-6">
                                    <h3 className="font-serif text-xl font-bold text-white mb-1 drop-shadow-md">Nụ Trầm Hương</h3>
                                    <p className="text-white/90 text-sm font-medium">Xông nhà, tẩy uế</p>
                                </div>
                            </div>
                            <div className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-2xl shadow-lg cursor-pointer border border-white/20">
                                <img alt="Vòng Tay Trầm" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4KhmQTFRqR-iv3OFaUSXqpAVQ9a2ujEk1u5BvSdUw2VRd5C824TtXkFs9ABsmxHZ3Eq6LIVRTX4bj6zkxDZaem3PrNk3lLoxF3zFg-09y9TS5QnUKwoslW0kLAv6Z0fAK8NViFKpxt-p-5-5RAeRyLPs2cU-XnjuT7_dqgY9KVpqtw37Kh65CsipalOCgVB37m2rDXl8rmhA-1HRcDT9Vc-BhxWGLWtwp4lOoZ7qaR4LK3v4IVLFOKZjeByL4p00CCASI465-ZtaH" />
                                <div className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors"></div>
                                <div className="absolute inset-0 flex flex-col justify-end p-6">
                                    <h3 className="font-serif text-xl font-bold text-white mb-1 drop-shadow-md">Trang Sức Trầm</h3>
                                    <p className="text-white/90 text-sm font-medium">Bình an bên mình</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-10">
                            <a className="px-6 py-3 rounded-full bg-white border border-accent-gold/20 text-text-main hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm font-bold text-sm tracking-wide" href="#">Nhang Cây</a>
                            <a className="px-6 py-3 rounded-full bg-white border border-accent-gold/20 text-text-main hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm font-bold text-sm tracking-wide" href="#">Nhang Không Tăm</a>
                            <a className="px-6 py-3 rounded-full bg-white border border-accent-gold/20 text-text-main hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm font-bold text-sm tracking-wide" href="#">Quà Tặng Cao Cấp</a>
                            <a className="px-6 py-3 rounded-full bg-white border border-accent-gold/20 text-text-main hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm font-bold text-sm tracking-wide" href="#">Phụ Kiện Xông</a>
                        </div>
                    </div>
                </section>

                {/* Quote Section */}
                <section className="py-16 bg-primary text-white text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pattern-dots"></div>
                    <img alt="Tranh lụa mây" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen pointer-events-none" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1SIk0W2_zmZFz10h8YLZSZX9FRWBaeERDmxfpWxqoZ3fu-HbjPTz2srTRdvNHdlHRwg0rrNaEuQQrjRLUKULpa9yzbRwsBYGtUmyIshVH97-v8FnhIc3HPZq_FbgN1ga_KR-2K7sLs7Fsc6B_ErYWogCYsEMEUMHLtypy5XZ1wRa0Sks2TjVoHot4dj_RVrbiFxggG09P9Fmr6l-JTANhuS4UHDWWv7NSAyn19Z9Q37ronWQQfvcohiZCmlNd1idQrSL0WdZOzaxD" />
                    <div className="container mx-auto px-4 relative z-10">
                        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">format_quote</span>
                        <p className="font-serif text-2xl md:text-3xl lg:text-4xl leading-relaxed max-w-4xl mx-auto italic font-medium">
                            "Hương trầm là tiếng nói của tâm linh, là cầu nối giữa đất và trời, giữa con người và tổ tiên."
                        </p>
                    </div>
                </section>

                {/* Flash Sale Section */}
                <section className="py-20 bg-white/50 relative" id="flash-sale">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-surface-accent/30 skew-x-12 transform origin-top-right"></div>
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-primary text-xs font-bold uppercase tracking-wide mb-3">
                                    <span className="animate-pulse">●</span> Ưu đãi giới hạn
                                </div>
                                <h2 className="font-serif text-3xl md:text-4xl font-bold text-text-main">Trao Gửi Yêu Thương</h2>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-text-sub bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                                <span>Kết thúc sau:</span>
                                <div className="flex gap-1 text-primary font-mono font-bold text-lg">
                                    <span>02</span>:<span>15</span>:<span>48</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {flashSaleProducts.length > 0 ? flashSaleProducts.map((product) => (
                                <Link href={`/products/${product.slug}`} key={product.id}>
                                    <div className="group bg-white rounded-2xl p-4 border border-gray-200 hover:border-accent-gold shadow-sm hover:shadow-xl transition-all duration-300">
                                        <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-4 bg-surface-accent">
                                            <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow-md">-30%</div>
                                            <ProductImage
                                                src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3_PiQCS8QGvrIj99N-j3jeC831CFiaHuU8_BnFOqJSxKLbQpSZQx2w0BNwqIP1rXpa0D3HIWZCkHpgS3GpT7eFCspZIhtXde8F5GDBDroYLZb-_7H_uRR9pP3QnyUbEl3OOrlhcdiQM5vFvoX0d2iHzZHD0FMh7N9up-J0EIrGM1FZe8zqXVNQOCnieBPFJpK6AjtqBiEFLUFWMsLJkMFw4Ci6leh7XKdmvbfb_Cj5JRzPVV_Rs917e_ClSWqpZLfFQPNCrNcT49N'}
                                                alt={product.translation?.title}
                                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <button className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg text-text-main hover:text-primary transition-colors opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300 hover:scale-110">
                                                <span className="material-symbols-outlined text-xl font-bold">shopping_cart</span>
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-text-main mb-1 truncate group-hover:text-primary transition-colors text-lg">{product.translation?.title}</h3>
                                        <div className="flex items-end justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-500 line-through font-medium">{(Number(product.price) * 1.3).toLocaleString()}₫</span>
                                                <span className="text-lg font-bold text-primary">{formatPrice(Number(product.price || 0))}</span>
                                            </div>
                                            <div className="flex text-accent-gold-dark text-xs">
                                                <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                                                <span className="text-gray-500 ml-1 font-bold">5.0</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )) : (
                                <div className="col-span-4 text-center text-gray-500">Đang cập nhật sản phẩm khuyến mãi...</div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Popular Products Section */}
                <section className="py-20 lg:py-28 relative" id="products">
                    <div className="ornament-divider">
                        <span className="material-symbols-outlined text-accent-gold-dark text-2xl relative z-10">spa</span>
                        <img alt="Decoration" className="absolute w-48 opacity-40 mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1ERgD_6s9LrHv7IGQx0wusLIRS8vcYOftwIwh0xkhBEpuGwqp8RMCG8cs0-n0Di0F-aOzWzckmD4-lj-IR3TaQ3JL1KyLYP09dcdsUktAfaCWajyV6DTT_SgzgQ2edM7kyE6OGHM5e4Nf-7ENoU-mTyOJMbuJ1x_wZvDoay6ByOeZd9esaXxI27Amt2iwFPbBYM_5-jUo_yDmcYvJGRO1jUlLTaYSbUdX-edfV_dVUzCCNpnzcvAy5CZpkz15W_YE4n9uk0EhSSWc" />
                    </div>
                    <img alt="Tranh lụa tre" className="hidden 2xl:block absolute top-40 left-0 w-64 h-auto opacity-15 silk-illustration mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPbp-qB0x1Eh9uP5wPGvB2ddr40E4EorPXyKNw891MwbXSoGiTmKI28RzSqPpMQqYWbtIkN93OjkDTnjK_3rcNvxSej6z42B-BQCUSAB6owcy40qB9ENiVwqmSMrFsYTYsFjgFalLV3qhXieUofItpVt68wSZry9VpGeARkJoKA0GwtGpFewqBBmDCY3gQ-8NiTsS0P_GRIcef_62Mld5pw6QYBWSex9Pp1JU6j9p0ZiqBuL0ktUVgHdlXOCOvZ0kBoMxo7XcYL11n" />
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <div className="grid lg:grid-cols-12 gap-12">
                            <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-8">
                                <div>
                                    <span className="text-primary font-bold uppercase tracking-widest text-sm">Tuyệt Phẩm</span>
                                    <h2 className="text-4xl lg:text-5xl font-serif font-bold text-text-main leading-tight mt-2">Được Yêu Thích Nhất</h2>
                                </div>
                                <p className="text-text-main/90 text-lg leading-relaxed font-semibold">
                                    Những sản phẩm được khách hàng tin dùng và quay lại nhiều nhất. Mỗi lựa chọn là một sự cam kết về chất lượng và trải nghiệm hương thơm đích thực.
                                </p>
                                <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl border border-white/50 shadow-sm">
                                    <div className="flex gap-4 items-start">
                                        <span className="material-symbols-outlined text-accent-gold-dark text-3xl">verified_user</span>
                                        <div>
                                            <h4 className="font-bold text-text-main mb-1">Bảo Hành Mùi Hương</h4>
                                            <p className="text-sm text-text-sub font-semibold">Hoàn tiền 100% nếu phát hiện hàng giả hoặc mùi hương không như mô tả.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-8 space-y-8">
                                {products.slice(0, 3).map((product) => (
                                    <div key={product.id} className="group flex flex-col md:flex-row gap-6 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/40">
                                        <div className="w-full md:w-48 aspect-square shrink-0 overflow-hidden rounded-xl bg-surface-accent border border-gray-100">
                                            <img alt={product.translation?.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJpMCUidBU7fmIn-cUc3Z4x0Rtlui8PJFsU_RCc2Oq2kdq543MBFr0t1hrrtru7NJ-Ue5J1C4xpiIOmIHAeHoaGz1qcjie4bDETM9IdBTqS5ASoADqm5jD2pUAUdhPgC75s8tjBnQszVtshlm1hFHDGaF2KSm17HvIbSXHOq3hul_fWRbn0_m2gbB_H1Z7mveIIg64MUNMAQ-NKJqXoecNgImjncAubBnUtjNI-e9LSrgPDp9nsCVfcACFbHI9xyv9wg1AkDPFXO45'} />
                                        </div>
                                        <div className="flex flex-col justify-between flex-1">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-serif text-2xl font-bold text-text-main group-hover:text-primary transition-colors cursor-pointer">{product.translation?.title}</h4>
                                                    <span className="text-xl font-bold text-primary">{formatPrice(Number(product.price || 0))}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="flex text-accent-gold-dark text-xs">
                                                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                                                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                                                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                                                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                                                        <span className="material-symbols-outlined text-[16px] fill-current">star</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500 font-bold">(156 đánh giá)</span>
                                                </div>
                                                <p className="text-text-sub mb-4 line-clamp-2 font-semibold">{product.translation?.description}</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <Link href={`/products/${product.slug}`} className="flex-1">
                                                    <button className="w-full px-6 py-2.5 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors uppercase tracking-wide shadow-md">Thêm vào giỏ</button>
                                                </Link>
                                                <Link href={`/products/${product.slug}`}>
                                                    <button className="px-4 py-2.5 border border-gray-300 rounded-lg text-text-main hover:bg-gray-50 transition-colors font-bold text-sm">Xem chi tiết</button>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Customer Section */}
                <section className="bg-background-dark text-white py-20 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCTEhF6nYXUFQqme420x-8MjtH4uUg24dfEfHSdpSP-reCtR3k0ktxMrYVMWSisJwTHSr4IVwO_fshPCDxWX7XRypxRJNzU8M6BINOB_CjlV_0YLl4IgIR57eCpTIgReMORytWY9nWG22p_SgzALhYR2vFAJbY70G0JSEx6P7WFjJuvebfR3BTWlnCnsttcbZl6zVv3l1aZHhQ1F_oFISyKamvxcneSZBdgter7YNQ-Baj0A5nEsg6VI3o0ZY7d1e8VHTL9EDzIU-rW')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}></div>
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <div className="text-center mb-16">
                            <span className="text-accent-gold font-bold uppercase tracking-widest text-sm block mb-3">Niềm Tin Khách Hàng</span>
                            <h3 className="text-3xl md:text-4xl font-serif font-bold">Người Bạn Đồng Hành</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-accent-gold/50 transition-colors group">
                                <div className="flex items-center gap-4 mb-6">
                                    <img alt="Customer" className="h-12 w-12 rounded-full object-cover ring-2 ring-accent-gold/50 group-hover:ring-accent-gold transition-all" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQ-F2gzkO5VP-bYKvMckVYhX4GXTMXWeqDL7bvWWEjQaYfhn4f0KlyJOjOgG7dISgMsEMnNNVBqeZk28AdLy_8Ts7FNZlbOl3GwcM6o0VujmdsMllfkL5dfSK89aBbnJxrU97V2C4g9ltGXXmtmsKg5mlNrDz3YjGK4LlU-LmVmj4BnF6G8chMXjrleO1WjuKrTcMR8UJh_wyExG_gVdqDcejphCUte9_pzkS_NY0fKWCXaE_WOisAq55LdkyEBjVmJJwvVpZVBTHm" />
                                    <div>
                                        <p className="font-bold text-accent-gold">Chị Lan</p>
                                        <p className="text-xs text-white/70 font-medium">TP. Hồ Chí Minh</p>
                                    </div>
                                </div>
                                <p className="text-white/90 italic font-normal leading-relaxed">"Mùi thơm rất dễ chịu, thanh khiết, không bị nồng gắt như các loại khác mình từng dùng. Giao hàng nhanh và đóng gói rất cẩn thận, cảm giác như nhận một món quà quý."</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-accent-gold/50 transition-colors group transform md:-translate-y-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <img alt="Customer" className="h-12 w-12 rounded-full object-cover ring-2 ring-accent-gold/50 group-hover:ring-accent-gold transition-all" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDh575bTGq0Kb4S-mIDYezCj3ULm9Sv35NvhuRGzP9Wt7WNWxkRWHAWr1h4t32IX_kyux5fkTaloJy5ASrR1oSpvKwAXkzwt7b6ikZKkS19Pkaakc9FTFlEZbPvdWiAuqQsoyY_DjXg6fmrNYQ1NtrQsXwyXqSaI_KafGenzdfgQwxEc315hj5__-CZHTsIPDmjDG9Qz2ylOikzHqNParbAgUF0SAcCJJ6Q_-BFghONZt76PXEEiHFWPPtu3gm9gd7rxHdKlglfWmD-" />
                                    <div>
                                        <p className="font-bold text-accent-gold">Anh Tuấn</p>
                                        <p className="text-xs text-white/70 font-medium">Hà Nội</p>
                                    </div>
                                </div>
                                <p className="text-white/90 italic font-normal leading-relaxed">"Mua biếu bố mẹ dịp Tết, các cụ rất thích. Hộp quà sang trọng, nhang cháy lâu và thơm mùi gỗ tự nhiên. Chắc chắn sẽ ủng hộ shop dài dài vì chất lượng."</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 hover:border-accent-gold/50 transition-colors group">
                                <div className="flex items-center gap-4 mb-6">
                                    <img alt="Customer" className="h-12 w-12 rounded-full object-cover ring-2 ring-accent-gold/50 group-hover:ring-accent-gold transition-all" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATrmkPtESpW5eO-I5zAybQmgiGz11XPWP3oF7kHi6cydwcyc483LN262DZVIZnx2qYtrS-D_K6Db6B2OyhKsGLBiztVKR79rQ_6IXgRiWgHwfXYiiF6xsKNkKGJ4DlPivLu-B0xehxDByegMDzZez2vBrRfcEpCbknpHmq_BGV3Ik1kGg7kSiFqia0KCMbdXIxku9aVIOPbwfacfJ5qzXBwnua2rxoT-X2rOvVI7MgHUOMrhI8PnVPVNJXF_rKMDjTZrgE_5ezpRIy" />
                                    <div>
                                        <p className="font-bold text-accent-gold">Cô Mai</p>
                                        <p className="text-xs text-white/70 font-medium">Đà Nẵng</p>
                                    </div>
                                </div>
                                <p className="text-white/90 italic font-normal leading-relaxed">"Mình dùng để xông nhà mới, cảm giác không gian ấm cúng hẳn lên. Rất thích cách shop tư vấn nhiệt tình về phong thủy. Sản phẩm xứng đáng đồng tiền bát gạo."</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Blog Section */}
                <section className="py-20 lg:py-24 relative" id="blog">
                    <img alt="Tranh lụa hạc" className="absolute top-0 right-0 w-64 h-auto opacity-15 silk-illustration mix-blend-multiply" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5FntkrbQx_7zsbw0Ng2x-MPUCUTr0CRe1i-kwqdGfo-TYIH1mIXWItWA_4qdmM8mYIU7-jMcGhIL3l1sSzqqk9vo_5afqamACOxFlsoG9lNRlE2VJs3XpGblOKabiWFNdjuFtmyk86lzJq2Ir8jUOKHRQcLUJR6682dvaakeL4ayMBeIJNKXU0HQZbeYZHNMTQFndnwiICKXKoSb622ypFHlmh5oJzFsZd6UODhBSYgD9FWe9xlPDXez1odXXU3nzW9rQVMmqIDFO" />
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <div className="flex justify-between items-end mb-12 border-b border-accent-gold/30 pb-4">
                            <div>
                                <span className="text-primary font-bold uppercase tracking-widest text-sm mb-2 block">Góc Chia Sẻ</span>
                                <h2 className="text-3xl md:text-4xl font-serif font-bold text-text-main">Kiến Thức & Đời Sống</h2>
                            </div>
                            <a className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-text-main hover:text-primary transition-colors uppercase tracking-wide" href="#">
                                Xem tất cả <span className="material-symbols-outlined text-lg font-bold">arrow_forward</span>
                            </a>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            <article className="group cursor-pointer">
                                <div className="overflow-hidden rounded-2xl mb-6 aspect-[16/9] relative shadow-lg border border-white/20">
                                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur text-text-main px-3 py-1 text-xs font-bold rounded uppercase z-10 shadow-sm">Phong Thủy</div>
                                    <img alt="Tea ceremony" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMkN0jXAptukKsupSJmxfaDSbe9xHqfIrdP4Pu4-_SxXY4xG69k1MrMSVmNhSBMP2y0GfkHnD5cUl8VQ-csDrLHBGMfJPwZ_KkVkTGerJF_0DkQRXiZY5Im-yLe48z90sgfAnKzi13NJUce1u9f9KdAqEMe4H_tLB8QIS1rsaP9mbgzbaI7wQGsTLxez20crymrNQgT7zOQXSQw3_iOb2vKrTc5bXNZ86R-pFobgtMJdVcQAlA_ghchkbatoBWr3VlQMY-JJKMGAvR" />
                                </div>
                                <div className="space-y-3 pr-4">
                                    <div className="flex items-center text-xs text-text-sub font-bold gap-2 uppercase tracking-wide">
                                        <span>12 Tháng 10, 2023</span>
                                        <span>•</span>
                                        <span>5 phút đọc</span>
                                    </div>
                                    <h3 className="text-2xl font-serif font-bold text-text-main group-hover:text-primary transition-colors leading-tight">Công Dụng Của Trầm Hương Theo Phong Thủy Và Đời Sống</h3>
                                    <p className="text-text-main/90 font-medium line-clamp-2">Trầm hương được mệnh danh là &#39;Vua của các bậc phong thủy&#39; bởi khả năng xua đuổi tà khí, mang lại may mắn và tài lộc cho gia chủ...</p>
                                    <span className="inline-block text-sm font-bold text-primary underline decoration-transparent group-hover:decoration-primary transition-all">Đọc tiếp</span>
                                </div>
                            </article>
                            <article className="group cursor-pointer">
                                <div className="overflow-hidden rounded-2xl mb-6 aspect-[16/9] relative shadow-lg border border-white/20">
                                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur text-text-main px-3 py-1 text-xs font-bold rounded uppercase z-10 shadow-sm">Kiến Thức</div>
                                    <img alt="Incense smoke" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaMfKhdb6cx3OTnyOpFgcezKGAgOymVCfBPhjvh1yrzFBz4GV72iqBUaR_n_0Td6QYwW77RfnAkNqfnt0ZGWT6SutKiecU_37xeoteDAluLNsJb7E6cZOol2EpKtf67HvrEg8kZay79T-QwIlvKt2ZocH-F57PWMR0PaRPksjRkAaHeL1pQwpTnyqQrzHRlZRdnsO9kAoN1-oD686utk5jKu2b4tz8hpp1K6SrbipwfugYkdF2gJLvH9JoO2YQZUF_bBm4pWAC7Qde" />
                                </div>
                                <div className="space-y-3 pr-4">
                                    <div className="flex items-center text-xs text-text-sub font-bold gap-2 uppercase tracking-wide">
                                        <span>05 Tháng 10, 2023</span>
                                        <span>•</span>
                                        <span>3 phút đọc</span>
                                    </div>
                                    <h3 className="text-2xl font-serif font-bold text-text-main group-hover:text-primary transition-colors leading-tight">Cách Phân Biệt Trầm Hương Thật Giả Đơn Giản Tại Nhà</h3>
                                    <p className="text-text-main/90 font-medium line-clamp-2">Trên thị trường hiện nay có rất nhiều loại trầm giả tẩm hóa chất độc hại. Hãy cùng chuyên gia của Thiên Phúc tìm hiểu cách nhận biết chính xác...</p>
                                    <span className="inline-block text-sm font-bold text-primary underline decoration-transparent group-hover:decoration-primary transition-all">Đọc tiếp</span>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>
            </main>

            <TraditionalFooter />
        </div>
    );
}
