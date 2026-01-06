'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import ProductImage from '../ui/ProductImage';
import { ProductPrice } from '@/components/ui/ProductPrice';
import { useCurrency } from '@/hooks/useCurrency';
import { useProductDiscount } from '@/hooks/useProductDiscount';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import ScrollReveal from '../ui/ScrollReveal';
import { SHIMMER_PRESETS } from '@/lib/image-blur';
import EmptyState from '../ui/empty-state';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';

const BANNER_SLIDES = [
    {
        id: 'huong-cua-dat-troi',
        subtitle: 'Chương mở đầu',
        title: <>Hương Của<br /><span className="text-accent-gold italic font-light">Đất Trời</span></>,
        description: 'Từ những vết thương trên thân cây Dó Bầu, qua chục năm dãi dầu mưa nắng, kết tinh thành giọt máu của rừng già. Trầm hương Thiên Phúc - Nơi kể lại câu chuyện về mùi hương của sự bình an.',
        ctaLabel: 'Khám Phá Ngay',
        ctaHref: '/products',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTEhF6nYXUFQqme420x-8MjtH4uUg24dfEfHSdpSP-reCtR3k0ktxMrYVMWSisJwTHSr4IVwO_fshPCDxWX7XRypxRJNzU8M6BINOB_CjlV_0YLl4IgIR57eCpTIgReMORytWY9nWG22p_SgzALhYR2vFAJbY70G0JSEx6P7WFjJuvebfR3BTWlnCnsttcbZl6zVv3l1aZHhQ1F_oFISyKamvxcneSZBdgter7YNQ-Baj0A5nEsg6VI3o0ZY7d1e8VHTL9EDzIU-rW',
        rightImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3_PiQCS8QGvrIj99N-j3jeC831CFiaHuU8_BnFOqJSxKLbQpSZQx2w0BNwqIP1rXpa0D3HIWZCkHpgS3GpT7eFCspZIhtXde8F5GDBDroYLZb-_7H_uRR9pP3QnyUbEl3OOrlhcdiQM5vFvoX0d2iHzZHD0FMh7N9up-J0EIrGM1FZe8zqXVNQOCnieBPFJpK6AjtqBiEFLUFWMsLJkMFw4Ci6leh7XKdmvbfb_Cj5JRzPVV_Rs917e_ClSWqpZLfFQPNCrNcT49N'
    },
    {
        id: 'tinh-hoa-tram-viet',
        subtitle: 'Bộ Sưu Tập Mới',
        title: <>Tinh Hoa<br /><span className="text-accent-gold italic font-light">Trầm Việt</span></>,
        description: 'Tuyển chọn những phẩm vật trầm hương thượng hạng nhất, được chế tác thủ công bởi những nghệ nhân lành nghề, lưu giữ trọn vẹn hương thơm nguyên bản.',
        ctaLabel: 'Xem Bộ Sưu Tập',
        ctaHref: '/products',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdSR04opfgwFmAWGzfn7jCXO4We20hf1Fz0jyGri4Ts4rNU2LExkjoprytRDMz8dECXjELo-KCHmr__NPJnat3-5SCu-vIIlpmVeBEhp7M_UlxBRErpHythTa2_j8CJjkpI0w12EDhHEAzXuOpYneO6ZYp-fQFVstsRuY4RBR5rleo5gqeUJWrNlHy7rDOZ8rZMAlN9z3-KHLXuU4opf0cdPeXGnGl7_UUiwNY68IKovkwoOEt4J-tgVHucHPcpII8EkZ1VKQMsqYH',
        rightImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFQAJQ8CHWk4K1rLNZis7NU5TCjdTgej1LW0BY_W3udpP6I5ECvaXhqwGjt27vlvwkKQw27QGtaYVbmEi8JLnbdDbpflfjBwyRRFIheFX6duevY4tEeBAQjhiJaBLRtgIYCbJrE62U-k8rMKF6txndgCYnf6A0wS0ueAmdpFC0mZTPHwZpOhrnxV06i0NBxuqWbMCSSJ1PshSGR2SBdFm_7wUgYimVe71dpZPDCorf5JGn9Wae2i_a_NSaZ7K1z810psbyadlT0z6S'
    },
    {
        id: 'thien-dinh-an-lanh',
        subtitle: 'Không Gian Sống',
        title: <>Thiền Định<br /><span className="text-accent-gold italic font-light">An Lành</span></>,
        description: 'Kiến tạo không gian thanh tịnh cho ngôi nhà của bạn. Hương trầm dịu nhẹ giúp xua tan căng thẳng, mang lại sự thư thái và bình yên cho tâm hồn.',
        ctaLabel: 'Trải Nghiệm Ngay',
        ctaHref: '/products',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTEhF6nYXUFQqme420x-8MjtH4uUg24dfEfHSdpSP-reCtR3k0ktxMrYVMWSisJwTHSr4IVwO_fshPCDxWX7XRypxRJNzU8M6BINOB_CjlV_0YLl4IgIR57eCpTIgReMORytWY9nWG22p_SgzALhYR2vFAJbY70G0JSEx6P7WFjJuvebfR3BTWlnCnsttcbZl6zVv3l1aZHhQ1F_oFISyKamvxcneSZBdgter7YNQ-Baj0A5nEsg6VI3o0ZY7d1e8VHTL9EDzIU-rW',
        rightImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAaMfKhdb6cx3OTnyOpFgcezKGAgOymVCfBPhjvh1yrzFBz4GV72iqBUaR_n_0Td6QYwW77RfnAkNqfnt0ZGWT6SutKiecU_37xeoteDAluLNsJb7E6cZOol2EpKtf67HvrEg8kZay79T-QwIlvKt2ZocH-F57PWMR0PaRPksjRkAaHeL1pQwpTnyqQrzHRlZRdnsO9kAoN1-oD686utk5jKu2b4tz8hpp1K6SrbipwfugYkdF2gJLvH9JoO2YQZUF_bBm4pWAC7Qde'
    }
];

export default function TraditionalHome({ products, posts = [] }: { products: any[], posts?: any[] }) {
    const t = useTranslations('HomePage');
    const { formatPrice } = useCurrency();

    const flashSaleProducts = products.slice(0, 4);
    const featuredProducts = products.slice(0, 8);

    return (
        <div className="bg-brand-yellow font-display text-text-main antialiased selection:bg-primary selection:text-white bg-pattern-lotus flex flex-col min-h-screen">
            <TraditionalHeader />

            <main className="flex-1 overflow-x-hidden">
                {/* Hero Carousel Section */}
                <section className="relative w-full bg-background-dark min-h-[85vh] flex items-stretch">
                    <Carousel className="w-full flex" opts={{ loop: true, duration: 60 }}>
                        <CarouselContent className="m-0 h-full">
                            {BANNER_SLIDES.map((slide, index) => (
                                <CarouselItem key={slide.id} className="p-0 relative h-full min-h-[85vh] flex items-center pl-0">
                                    {/* Slide Background */}
                                    <div className="absolute inset-0 z-0">
                                        <Image
                                            src={slide.image}
                                            alt="Background texture"
                                            fill
                                            className="object-cover opacity-60 mix-blend-overlay"
                                            priority={index === 0}
                                            quality={75}
                                            sizes="100vw"
                                            placeholder="blur"
                                            blurDataURL={SHIMMER_PRESETS.hero}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-background-dark/80 to-transparent"></div>
                                    </div>

                                    {/* Slide Content */}
                                    <div className="container mx-auto px-4 xl:px-8 relative z-10 py-12 w-full">
                                        <div className="grid lg:grid-cols-12 gap-12 items-center">
                                            <div className="lg:col-span-5 space-y-8">
                                                <ScrollReveal animation="fade-up" delay={200} key={slide.id}>
                                                    <div className="inline-flex items-center gap-2 mb-2">
                                                        <div className="h-[1px] w-8 bg-accent-gold"></div>
                                                        <span className="text-accent-gold uppercase tracking-[0.3em] text-xs font-bold">{slide.subtitle}</span>
                                                    </div>
                                                    <h2 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-white mt-4">
                                                        {slide.title}
                                                    </h2>
                                                    <p className="text-lg text-white/90 font-normal leading-relaxed mt-6">
                                                        {slide.description}
                                                    </p>
                                                    <div className="flex flex-col sm:flex-row gap-4 pt-8">
                                                        <Link href={slide.ctaHref}>
                                                            <button className="group inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-base font-bold text-white shadow-lg transition-all hover:bg-primary-dark border border-primary">
                                                                <span>{slide.ctaLabel}</span>
                                                                <span className="material-symbols-outlined ml-2 text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                                            </button>
                                                        </Link>
                                                    </div>
                                                </ScrollReveal>
                                            </div>

                                            <div className="lg:col-span-7 relative h-[500px] lg:h-[600px] flex items-center justify-center">
                                                <ScrollReveal animation="fade-in" duration={1000} delay={300} key={`img-${slide.id}`} className="relative w-full h-full flex items-center justify-center">
                                                    <div className="absolute w-[90%] h-[90%] border border-white/5 rounded-full animate-spin duration-[20s]"></div>
                                                    <div className="absolute w-[70%] h-[70%] border border-accent-gold/20 rounded-full"></div>
                                                    <div className="relative z-10 w-[320px] md:w-[400px] h-[400px] md:h-[500px]">
                                                        <div className="absolute -inset-4 bg-accent-gold/20 blur-3xl rounded-full opacity-50"></div>
                                                        <Image
                                                            src={slide.rightImage}
                                                            alt={typeof slide.title === 'string' ? slide.title : 'Banner Image'}
                                                            fill
                                                            className="relative z-10 object-cover drop-shadow-2xl"
                                                            priority={index === 0}
                                                            quality={90}
                                                            sizes="(max-width: 768px) 320px, 400px"
                                                            placeholder="blur"
                                                            blurDataURL={SHIMMER_PRESETS.square}
                                                        />
                                                    </div>
                                                </ScrollReveal>
                                            </div>
                                        </div>
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>

                        {/* Navigation Buttons - Positioned Absolutely */}
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:block">
                            <CarouselPrevious className="relative left-0 bg-white/10 hover:bg-accent-gold border-white/20 text-white hover:text-white" />
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:block">
                            <CarouselNext className="relative right-0 bg-white/10 hover:bg-accent-gold border-white/20 text-white hover:text-white" />
                        </div>
                    </Carousel>
                </section>


                {/* Trust Badges */}
                <section className="py-20 bg-surface/40 backdrop-blur-sm relative border-y border-white/40 overflow-hidden">
                    {/* <img alt="Tranh lụa đầm sen" className="absolute bottom-0 left-0 w-full h-1/4 object-cover opacity-10 silk-illustration -z-10 mix-blend-multiply" src="https://images.unsplash.com/photo-1656687204808-ceca71970871?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" /> */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-accent-gold/40 to-transparent lg:block hidden"></div>
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <ScrollReveal animation="fade-up">
                            <div className="text-center max-w-2xl mx-auto mb-10">
                                <h2 className="font-serif text-3xl lg:text-4xl font-bold text-text-main mb-4">Cam Kết Từ Tâm</h2>
                                <p className="text-text-sub font-semibold text-lg">
                                    Chúng tôi không chỉ bán sản phẩm, chúng tôi trao gửi sự an tâm và tín ngưỡng thờ cúng thiêng liêng.
                                </p>
                            </div>
                        </ScrollReveal>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                            <ScrollReveal delay={100} animation="fade-up" className="h-full">
                                <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30 h-full">
                                    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                        <span className="material-symbols-outlined text-3xl">local_florist</span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 text-text-main">100% Tự Nhiên</h3>
                                    <p className="text-sm text-text-sub font-semibold">Nguyên liệu sạch, không hóa chất độc hại, an toàn cho sức khỏe.</p>
                                </div>
                            </ScrollReveal>
                            <ScrollReveal delay={200} animation="fade-up" className="h-full">
                                <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30 h-full">
                                    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                        <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 text-text-main">Chất Lượng Đỉnh Cao</h3>
                                    <p className="text-sm text-text-sub font-semibold">Quy trình kiểm định nghiêm ngặt, giữ trọn mùi hương nguyên bản.</p>
                                </div>
                            </ScrollReveal>
                            <ScrollReveal delay={300} animation="fade-up" className="h-full">
                                <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30 h-full">
                                    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                        <span className="material-symbols-outlined text-3xl">history_edu</span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 text-text-main">Di Sản 10 Năm</h3>
                                    <p className="text-sm text-text-sub font-semibold">Kinh nghiệm chế tác trầm hương gia truyền, uy tín bền vững.</p>
                                </div>
                            </ScrollReveal>
                            <ScrollReveal delay={400} animation="fade-up" className="h-full">
                                <div className="text-center group p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:border-accent-gold/30 h-full">
                                    <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full bg-surface-accent text-accent-gold-dark group-hover:scale-110 transition-transform border border-accent-gold/20">
                                        <span className="material-symbols-outlined text-3xl">sentiment_satisfied</span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-2 text-text-main">Hậu Mãi Tận Tâm</h3>
                                    <p className="text-sm text-text-sub font-semibold">Tư vấn đúng nhu cầu, đổi trả linh hoạt, đồng hành trọn đời.</p>
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </section>

                {/* Chapter 2: Origin Story Section */}
                <section className="py-24 lg:py-32 relative overflow-hidden bg-stone-900 text-white">
                    {/* Dark/Deep Background for contrast since Chapter 1 was light/mixed */}
                    <div className="absolute inset-0 z-0">
                        <Image
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdSR04opfgwFmAWGzfn7jCXO4We20hf1Fz0jyGri4Ts4rNU2LExkjoprytRDMz8dECXjELo-KCHmr__NPJnat3-5SCu-vIIlpmVeBEhp7M_UlxBRErpHythTa2_j8CJjkpI0w12EDhHEAzXuOpYneO6ZYp-fQFVstsRuY4RBR5rleo5gqeUJWrNlHy7rDOZ8rZMAlN9z3-KHLXuU4opf0cdPeXGnGl7_UUiwNY68IKovkwoOEt4J-tgVHucHPcpII8EkZ1VKQMsqYH"
                            alt="Dark wood texture"
                            fill
                            className="object-cover opacity-30 mix-blend-overlay"
                            quality={70}
                            sizes="100vw"
                            placeholder="blur"
                            blurDataURL={SHIMMER_PRESETS.hero}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-stone-950 via-stone-900/90 to-stone-950"></div>
                    </div>

                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <ScrollReveal animation="fade-up">
                            <div className="flex flex-col items-center justify-center mb-16 opacity-90">
                                <span className="material-symbols-outlined text-accent-gold text-3xl mb-4 animate-pulse">spa</span>
                                <div className="inline-flex items-center gap-3 mb-2">
                                    <div className="h-[1px] w-12 bg-accent-gold/60"></div>
                                    <span className="text-accent-gold uppercase tracking-[0.3em] text-xs font-bold">Chương II</span>
                                    <div className="h-[1px] w-12 bg-accent-gold/60"></div>
                                </div>
                                <h2 className="font-serif text-4xl lg:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-sm">Nỗi Đau Hóa Trầm</h2>
                            </div>
                        </ScrollReveal>

                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <div className="relative order-2 lg:order-1 group">
                                <ScrollReveal animation="fade-right" duration={1000}>
                                    <div className="relative z-10 w-full aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl rotate-2 group-hover:rotate-0 transition-all duration-1000">
                                        <Image
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-7y2yLATT2_GcJRYORWiazELMQkDetIhIC25nlJuNcbHDFFWD8Dm27LWFGJYgHDZysQMsHa6xZyv2qw2MCYMPXnOeBhXBj26Y0aAiM9XKIYHosBEqpnme6efQ0ldtzNF7KU8R-FOL2V-zKlhlPf5MBe49Zrwa5qrfgIflywRW9Tf9CIM3oB5MgacBUsjRDCn8uk--KVqrr82aiLpXZd3uMAfcBVfuYqwSEBc3guS4VQywYBDOOBDBGuWxnrVwmnmWc5zVJuA7v4b1"
                                            alt="The process of making incense"
                                            fill
                                            className="object-cover"
                                            quality={85}
                                            sizes="(max-width: 1024px) 100vw, 50vw"
                                            placeholder="blur"
                                            blurDataURL={SHIMMER_PRESETS.card}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                                        <div className="absolute bottom-10 left-8 right-8 text-white/90">
                                            <p className="font-serif italic text-xl leading-relaxed">"Chỉ những cây Dó Bầu chịu thương đau mới có thể sinh ra Trầm. <br />Cũng như con người, đi qua giông bão mới thấu hiểu sự bình an."</p>
                                        </div>
                                    </div>
                                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-accent-gold/20 rounded-full blur-[80px] -z-10 animate-pulse"></div>
                                </ScrollReveal>
                            </div>

                            <div className="order-1 lg:order-2 space-y-10 relative">
                                <ScrollReveal animation="fade-left" delay={200}>
                                    <div className="space-y-8 pl-0 lg:pl-10 relative border-l-2 border-white/10 lg:border-none">
                                        <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-accent-gold/30 to-transparent hidden lg:block"></div>

                                        <div className="relative pl-6 lg:pl-8">
                                            <span className="absolute left-0 top-0 lg:-left-[5px] w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-accent-gold shadow-[0_0_10px_rgba(213,109,11,0.8)] mt-2"></span>
                                            <h3 className="text-2xl font-serif font-bold text-amber-100 mb-3">Tổn Thương</h3>
                                            <p className="text-lg text-white/70 leading-relaxed font-light text-justify">
                                                Trong rừng già, cây Dó Bầu hứng chịu bom đạn, giông tố hay sự đục khoét của côn trùng. Thay vì chết đi, cây tiết ra một loại nhựa thơm bao bọc lấy vết thương ấy.
                                            </p>
                                        </div>

                                        <div className="relative pl-6 lg:pl-8">
                                            <span className="absolute left-0 top-0 lg:-left-[5px] w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-stone-600 border border-white/30 mt-2"></span>
                                            <h3 className="text-2xl font-serif font-bold text-amber-100 mb-3">Kết Tinh</h3>
                                            <p className="text-lg text-white/70 leading-relaxed font-light text-justify">
                                                Qua hàng chục năm thầm lặng, hấp thụ linh khí của đất trời, lớp nhựa bao bọc ấy dần biến đổi, cô đặc lại thành thớ gỗ đen bóng, tỏa hương thơm vĩnh cửu. Đó chính là Trầm Hương.
                                            </p>
                                        </div>

                                        <div className="relative pl-6 lg:pl-8">
                                            <span className="absolute left-0 top-0 lg:-left-[5px] w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-stone-600 border border-white/30 mt-2"></span>
                                            <h3 className="text-2xl font-serif font-bold text-amber-100 mb-3">Chữa Lành</h3>
                                            <p className="text-lg text-white/70 leading-relaxed font-light text-justify">
                                                Thiên Phúc tin rằng, mỗi sản phẩm trầm hương không chỉ là một mùi hương, mà là câu chuyện về nghị lực và sự chữa lành. Đốt nén trầm là lúc ta tìm về sự tĩnh tại trong tâm hồn.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-10 pl-0 lg:pl-10">
                                        <Link href="/brand-story" className="group flex items-center gap-4 text-accent-gold hover:text-white transition-colors">
                                            <div className="h-[1px] w-12 bg-current transition-all group-hover:w-20"></div>
                                            <span className="uppercase tracking-widest text-sm font-bold">Đọc toàn bộ câu chuyện</span>
                                        </Link>
                                    </div>
                                </ScrollReveal>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Chapter 3: Collection Section */}
                <section className="py-24 lg:py-32 relative bg-stone-50" id="collection">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-stone-700 to-stone-50"></div>
                    <img alt="Background Ink" className="absolute top-[20%] right-0 w-1/3 opacity-5 mix-blend-multiply pointer-events-none" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTZTOm2b961Nkr-mdubbi08OgTgVUP12bdFu780qdmTi6hxqypZZiIBCCRwEXpeRYHAxMCpBvNlEU3eAPPOm8YWEBeWraAlvVPONXA6WPRgZ4rS-qGcjAKpv_RXgw5HL4CGUn_5WIw0GDXojGpPts7F5SxKVFfkNT893aKIyHX9O2k6FtMOYI8mqNevXNhTfhC2FbGZfOjjLn0MDA17rxB0I1ixGuOFa1aCRvi5JQqIl6p714U9BkbhWiB8RmVhcAl7rRL2VUZ_5k0" />

                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <ScrollReveal animation="fade-up">
                            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                                <div>
                                    <div className="inline-flex items-center gap-3 mb-3">
                                        <span className="text-accent-gold-dark uppercase tracking-[0.3em] text-xs font-bold">Chương III</span>
                                        <div className="h-[1px] w-20 bg-accent-gold-dark/40"></div>
                                    </div>
                                    <h2 className="font-serif text-5xl lg:text-6xl font-bold text-text-main leading-none">Không Gian<br />Trầm Mặc</h2>
                                </div>
                                <p className="md:max-w-md text-text-sub font-medium text-right md:text-left text-lg leading-relaxed border-l-4 border-accent-gold pl-6">
                                    "Hương thơm không hình không tướng, nhưng lại có khả năng kiến tạo không gian và dẫn lối cảm xúc."
                                </p>
                            </div>
                        </ScrollReveal>

                        <ScrollReveal animation="fade-up" delay={200}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 auto-rows-[300px]">
                                {/* Hero Card of Collection */}
                                <div className="lg:col-span-8 lg:row-span-2 relative group overflow-hidden rounded-[2rem] shadow-2xl cursor-pointer">
                                    <Image
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFQAJQ8CHWk4K1rLNZis7NU5TCjdTgej1LW0BY_W3udpP6I5ECvaXhqwGjt27vlvwkKQw27QGtaYVbmEi8JLnbdDbpflfjBwyRRFIheFX6duevY4tEeBAQjhiJaBLRtgIYCbJrE62U-k8rMKF6txndgCYnf6A0wS0ueAmdpFC0mZTPHwZpOhrnxV06i0NBxuqWbMCSSJ1PshSGR2SBdFm_7wUgYimVe71dpZPDCorf5JGn9Wae2i_a_NSaZ7K1z810psbyadlT0z6S"
                                        alt="Thưởng Trầm Nghệ Thuật"
                                        fill
                                        className="object-cover"
                                        quality={85}
                                        sizes="(max-width: 1024px) 100vw, 66vw"
                                        placeholder="blur"
                                        blurDataURL={SHIMMER_PRESETS.landscape}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
                                    <div className="absolute top-10 left-10 right-10 bottom-10 flex flex-col justify-between">
                                        <span className="text-white/60 font-mono text-sm uppercase tracking-widest">01 / Nghệ Thuật Sống</span>
                                        <div>
                                            <h3 className="font-serif text-4xl lg:text-5xl font-bold text-white mb-4 drop-shadow-xl">Thưởng Trầm Đạo</h3>
                                            <p className="text-white/80 font-light text-lg max-w-lg mb-8 drop-shadow">Dụng cụ thưởng trầm tinh xảo, mỗi món vật là một tác phẩm nghệ thuật, đưa bạn vào trạng thái thiền định sâu lắng.</p>
                                            <button className="px-8 py-3 bg-white text-text-main rounded-full font-bold uppercase tracking-wider text-sm hover:bg-accent-gold hover:text-white transition-all shadow-lg">Khám phá</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary Cards */}
                                <div className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-[2rem] shadow-xl cursor-pointer">
                                    <Image
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJXdbsle4XugPy2GHLlKjLV9fVmNMbUg8sc0_axXBHWzw9t_Sf05V0la94sPA_cryAD92fxpiVjee14rdLoemCrS-47ehv-plnpgRrUYk_i8-ROHaKOFVHokQo6T7QEJQf9FGh61Pfg_HJZ5IKPhxWH7B2ZG_sjFUrWtfd3zBpa-Qw_SoqyJvgh39JZO-2E0A38QZI8bRyvbjlIk3MiamFFK-hsOVPVkp_Bw5EFCcdTsNbubUJKaNyiDyfeYQPCaszEJEXcLj3Ougl"
                                        alt="Nụ Trầm Hương"
                                        fill
                                        className="object-cover"
                                        quality={80}
                                        sizes="(max-width: 1024px) 50vw, 33vw"
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL={SHIMMER_PRESETS.card}
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-500"></div>
                                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                        <span className="text-accent-gold font-mono text-xs uppercase mb-2">02 / Thanh Tẩy</span>
                                        <h3 className="font-serif text-2xl font-bold text-white mb-1">Nụ Trầm Hương</h3>
                                        <p className="text-white/80 text-sm">Xông nhà, đẩy lùi tà khí</p>
                                    </div>
                                </div>

                                <div className="lg:col-span-4 lg:row-span-1 relative group overflow-hidden rounded-[2rem] shadow-xl cursor-pointer">
                                    <Image
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4KhmQTFRqR-iv3OFaUSXqpAVQ9a2ujEk1u5BvSdUw2VRd5C824TtXkFs9ABsmxHZ3Eq6LIVRTX4bj6zkxDZaem3PrNk3lLoxF3zFg-09y9TS5QnUKwoslW0kLAv6Z0fAK8NViFKpxt-p-5-5RAeRyLPs2cU-XnjuT7_dqgY9KVpqtw37Kh65CsipalOCgVB37m2rDXl8rmhA-1HRcDT9Vc-BhxWGLWtwp4lOoZ7qaR4LK3v4IVLFOKZjeByL4p00CCASI465-ZtaH"
                                        alt="Vòng Tay Trầm"
                                        fill
                                        className="object-cover"
                                        quality={80}
                                        sizes="(max-width: 1024px) 50vw, 33vw"
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL={SHIMMER_PRESETS.card}
                                    />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-500"></div>
                                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                        <span className="text-accent-gold font-mono text-xs uppercase mb-2">03 / Trang Sức</span>
                                        <h3 className="font-serif text-2xl font-bold text-white mb-1">Chuỗi Hạt Trầm</h3>
                                        <p className="text-white/80 text-sm">Bình an, may mắn bên mình</p>
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Category Pills */}
                        <div className="flex flex-wrap justify-center gap-4 mt-16 opacity-80">
                            {['Nhang Cây', 'Nhang Không Tăm', 'Quà Tặng', 'Phụ Kiện'].map((item) => (
                                <a key={item} className="px-8 py-4 rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-800 hover:text-white hover:border-stone-800 transition-all shadow-sm font-bold text-sm tracking-wide" href="#">
                                    {item}
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Quote Section */}
                <section className="py-16 bg-primary text-white text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pattern-dots"></div>
                    <img alt="Tranh lụa mây" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen pointer-events-none" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1SIk0W2_zmZFz10h8YLZSZX9FRWBaeERDmxfpWxqoZ3fu-HbjPTz2srTRdvNHdlHRwg0rrNaEuQQrjRLUKULpa9yzbRwsBYGtUmyIshVH97-v8FnhIc3HPZq_FbgN1ga_KR-2K7sLs7Fsc6B_ErYWogCYsEMEUMHLtypy5XZ1wRa0Sks2TjVoHot4dj_RVrbiFxggG09P9Fmr6l-JTANhuS4UHDWWv7NSAyn19Z9Q37ronWQQfvcohiZCmlNd1idQrSL0WdZOzaxD" />
                    <div className="container mx-auto px-4 relative z-10">
                        <ScrollReveal animation="zoom-in" duration={1000}>
                            <span className="material-symbols-outlined text-4xl mb-4 opacity-50">format_quote</span>
                            <p className="font-serif text-2xl md:text-3xl lg:text-4xl leading-relaxed max-w-4xl mx-auto italic font-medium">
                                "Hương trầm là tiếng nói của tâm linh, là cầu nối giữa đất và trời, giữa con người và tổ tiên."
                            </p>
                        </ScrollReveal>
                    </div>
                </section>

                {/* Flash Sale Section */}
                <section className="py-20 bg-white/50 relative" id="flash-sale">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-surface-accent/30 skew-x-12 transform origin-top-right"></div>
                    <div className="container mx-auto px-4 xl:px-8 relative z-10">
                        <ScrollReveal animation="fade-up">
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
                        </ScrollReveal>
                        <ScrollReveal animation="fade-up" delay={200}>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {flashSaleProducts.length > 0 ? flashSaleProducts.map((product) => (
                                    <Link href={`/products/${product.slug}`} key={product.id}>
                                        <div className="group bg-white rounded-2xl p-3 md:p-4 border border-gray-200 hover:border-accent-gold shadow-sm hover:shadow-xl transition-all duration-300">
                                            <div className="relative aspect-[4/5] rounded-xl overflow-hidden mb-3 md:mb-4 bg-surface-accent">
                                                <div className="absolute top-3 left-3 bg-primary text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded shadow-md">-30%</div>
                                                <ProductImage
                                                    src={product.images?.[0] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3_PiQCS8QGvrIj99N-j3jeC831CFiaHuU8_BnFOqJSxKLbQpSZQx2w0BNwqIP1rXpa0D3HIWZCkHpgS3GpT7eFCspZIhtXde8F5GDBDroYLZb-_7H_uRR9pP3QnyUbEl3OOrlhcdiQM5vFvoX0d2iHzZHD0FMh7N9up-J0EIrGM1FZe8zqXVNQOCnieBPFJpK6AjtqBiEFLUFWMsLJkMFw4Ci6leh7XKdmvbfb_Cj5JRzPVV_Rs917e_ClSWqpZLfFQPNCrNcT49N'}
                                                    alt={product.translation?.title}
                                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <button className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow-lg text-text-main hover:text-primary transition-colors opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300 hover:scale-110 hidden md:block">
                                                    <span className="material-symbols-outlined text-xl font-bold">shopping_cart</span>
                                                </button>
                                            </div>
                                            <h3 className="font-bold text-text-main mb-1 truncate group-hover:text-primary transition-colors text-sm md:text-lg">{product.translation?.title}</h3>
                                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-1">
                                                <ProductPrice product={product} size="sm" theme="traditional" showBadge={false} />
                                                <div className="flex text-accent-gold-dark text-xs">
                                                    <span className="material-symbols-outlined text-[14px] md:text-[16px] fill-current">star</span>
                                                    <span className="text-gray-500 ml-1 font-bold">5.0</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="col-span-4 text-center text-gray-500">Đang cập nhật sản phẩm khuyến mãi...</div>
                                )}
                            </div>
                        </ScrollReveal>
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
                                <ScrollReveal animation="fade-in">
                                    <div>
                                        <span className="text-primary font-bold uppercase tracking-widest text-sm">Tuyệt Phẩm</span>
                                        <h2 className="text-4xl lg:text-5xl font-serif font-bold text-text-main leading-tight mt-2">Được Yêu Thích Nhất</h2>
                                    </div>
                                    <p className="text-text-main/90 text-lg leading-relaxed font-semibold mt-4">
                                        Những sản phẩm được khách hàng tin dùng và quay lại nhiều nhất. Mỗi lựa chọn là một sự cam kết về chất lượng và trải nghiệm hương thơm đích thực.
                                    </p>
                                    <div className="bg-white/70 backdrop-blur-md p-6 rounded-xl border border-white/50 shadow-sm mt-8">
                                        <div className="flex gap-4 items-start">
                                            <span className="material-symbols-outlined text-accent-gold-dark text-3xl">verified_user</span>
                                            <div>
                                                <h4 className="font-bold text-text-main mb-1">Bảo Hành Mùi Hương</h4>
                                                <p className="text-sm text-text-sub font-semibold">Hoàn tiền 100% nếu phát hiện hàng giả hoặc mùi hương không như mô tả.</p>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
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
                                                    {/* Use hook for discount */}
                                                    <ProductPrice product={product} size="md" theme="traditional" showBadge={false} />
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
                                                    <button className="w-full px-6 py-3 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors uppercase tracking-wide shadow-md">Thêm vào giỏ</button>
                                                </Link>
                                                <Link href={`/products/${product.slug}`}>
                                                    <button className="px-4 py-3 border border-gray-300 rounded-lg text-text-main hover:bg-gray-50 transition-colors font-bold text-sm">Xem chi tiết</button>
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
                            <ScrollReveal animation="fade-up">
                                <span className="text-accent-gold font-bold uppercase tracking-widest text-sm block mb-3">Niềm Tin Khách Hàng</span>
                                <h3 className="text-3xl md:text-4xl font-serif font-bold">Người Bạn Đồng Hành</h3>
                            </ScrollReveal>
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
                        <ScrollReveal animation="fade-up">
                            <div className="flex justify-between items-end mb-12 border-b border-accent-gold/30 pb-4">
                                <div>
                                    <span className="text-primary font-bold uppercase tracking-widest text-sm mb-2 block">Góc Chia Sẻ</span>
                                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-text-main">Kiến Thức & Đời Sống</h2>
                                </div>
                                <Link className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-text-main hover:text-primary transition-colors uppercase tracking-wide" href="/blog">
                                    Xem tất cả <span className="material-symbols-outlined text-lg font-bold">arrow_forward</span>
                                </Link>
                            </div>
                        </ScrollReveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            {posts.length > 0 ? (
                                posts.slice(0, 2).map((post, index) => (
                                    <ScrollReveal key={post.id} delay={100 * (index + 1)} animation="fade-up" className="h-full">
                                        <Link href={`/blog/${post.slug}`} className="group cursor-pointer h-full block">
                                            <article className="h-full flex flex-col">
                                                <div className="overflow-hidden rounded-2xl mb-6 aspect-[16/9] relative shadow-lg border border-white/20">
                                                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur text-text-main px-3 py-1 text-xs font-bold rounded uppercase z-10 shadow-sm">{post.category?.name || 'Kiến Thức'}</div>
                                                    <Image
                                                        alt={post.title}
                                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                                        fill
                                                        src={post.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwD0foJUP_hTJwAfMEq8pczGOEqf3yl0c5rIvOIkLcsLSMaPRa3lWPo26cFQBDBiCaJPywFlQOhci8vHtJJHGF5_KLpC6FSyTIL4BBKvfs3jVPh0mAjq8N_BqiFEchwW6m3euXU_i600Fz7RGb1QHZXZlf023XpCfsJ5jKHbwpkpHNzAvKbCb7m3ojkdPOFWSEGkjHsFI_c_EZtzzRC2bIRffXiev81bLAJt3qEqYLbAwY6Np0doM5PO_iNx5-zBZMGBUSuFOg1rcg'}
                                                        placeholder="blur"
                                                        blurDataURL={SHIMMER_PRESETS.landscape}
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <div className="flex items-center gap-4 text-xs font-medium text-text-muted mb-3">
                                                        <span>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(post.published_at || post.created_at))}</span>
                                                        <span className="w-1 h-1 rounded-full bg-accent-gold"></span>
                                                        <span>5 phút đọc</span>
                                                    </div>
                                                    <h3 className="text-xl font-bold font-serif mb-3 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h3>
                                                    <p className="text-text-muted text-sm line-clamp-3 mb-4 leading-relaxed flex-1">{post.excerpt || post.content?.substring(0, 150) + '...'}</p>
                                                    <span className="text-primary font-bold text-sm uppercase tracking-wide group-hover:underline decoration-accent-gold underline-offset-4">Đọc tiếp</span>
                                                </div>
                                            </article>
                                        </Link>
                                    </ScrollReveal>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-10 text-text-sub">Chưa có bài viết nào.</div>
                            )}
                        </div>
                    </div>
                </section >
            </main >

            <TraditionalFooter />
        </div >
    );
}
