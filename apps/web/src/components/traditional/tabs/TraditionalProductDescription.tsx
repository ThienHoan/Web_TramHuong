'use client';

import React from 'react';
import Image from 'next/image';

interface TraditionalProductDescriptionProps {
    product: any;
}

export default function TraditionalProductDescription({ product }: TraditionalProductDescriptionProps) {
    // Mock benefits for demonstration - ideally came from product attributes
    const benefits = [
        { icon: 'spa', title: 'Thanh Lọc Không Khí', desc: 'Loại bỏ tà khí, mang lại sự tươi mới cho không gian sống.' },
        { icon: 'self_improvement', title: 'Thư Giãn Tinh Thần', desc: 'Hương thơm sâu lắng giảm căng thẳng, lo âu hiệu quả.' },
        { icon: 'partly_cloudy_day', title: 'Hỗ Trợ Thiền Định', desc: 'Giúp tâm trí tĩnh lặng, dễ dàng đi vào trạng thái định tâm.' },
        { icon: 'volunteer_activism', title: 'Vượng Khí Tài Lộc', desc: 'Thu hút may mắn và năng lượng tích cực cho gia chủ.' },
    ];

    return (
        <div className="animate-fade-in space-y-12">
            {/* Title Section */}
            <div className="text-center relative py-6">
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-trad-amber-700/30 to-transparent"></div>
                <h2 className="relative inline-block bg-trad-bg-light px-8 text-3xl font-serif font-bold text-trad-amber-700">
                    Bản Chất Hương Trầm – Từ Thiên Nhiên Việt Nam
                </h2>
            </div>

            {/* Main Description Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="prose prose-lg text-trad-text-main/90 font-serif leading-loose">
                    <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-trad-red-900 first-letter:mr-3 first-letter:float-left">
                        {product.translation.description}
                    </p>
                    <p className="mt-4">
                        Mỗi nén nhang là sự kết tinh của trời đất, qua bàn tay tỉ mỉ của những nghệ nhân lành nghề. Chúng tôi cam kết sử dụng 100% bột trầm hương tự nhiên, không hóa chất độc hại, giữ trọn vẹn mùi hương nguyên bản mộc mạc mà quyến rũ.
                    </p>
                </div>
                {/* Visual Image */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border-4 border-white/50 transform rotate-2 hover:rotate-0 transition-transform duration-700">
                    <div className="absolute inset-0 bg-trad-amber-900/10 mix-blend-multiply pointer-events-none z-10"></div>
                    {/* Placeholder for "Crafting" or "Burning" */}
                    <div className="w-full h-full bg-trad-bg-warm flex items-center justify-center">
                        <span className="material-symbols-outlined text-6xl text-trad-amber-700/30">landscape</span>
                    </div>
                </div>
            </div>

            {/* Visual Break - Image Strip */}
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="aspect-video relative rounded-lg overflow-hidden border border-trad-border-warm shadow-sm group">
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                        <div className="w-full h-full bg-trad-bg-warm flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-trad-text-muted/50">filter_hdr</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Benefits Section - "Gems" */}
            <div className="bg-white/50 p-8 rounded-2xl border border-trad-border-warm/50 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-trad-text-main text-center mb-8 font-serif">Giá Trị Cốt Lõi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="group flex flex-col items-center text-center p-6 bg-white rounded-xl border border-trad-border-subtle hover:border-trad-primary hover:shadow-lg transition-all transform hover:-translate-y-1">
                            <div className="w-16 h-16 rounded-full bg-trad-bg-warm flex items-center justify-center text-trad-primary mb-4 group-hover:rotate-12 transition-transform">
                                <span className="material-symbols-outlined text-3xl">{benefit.icon}</span>
                            </div>
                            <h4 className="font-bold text-trad-text-main text-lg mb-2">{benefit.title}</h4>
                            <p className="text-sm text-trad-text-muted leading-relaxed">{benefit.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
