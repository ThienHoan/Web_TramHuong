'use client';

import React from 'react';

interface TraditionalProductStoryProps {
    product: any;
}

export default function TraditionalProductStory({ product }: TraditionalProductStoryProps) {
    const storyText = product.translation.story || product.translation.description;

    return (
        <div className="animate-fade-in relative">
            {/* Decoration Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-trad-primary/5 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-trad-amber-200/10 rounded-full blur-3xl -z-10"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Scrollable Story Text */}
                <div className="lg:col-span-7">
                    <h2 className="text-4xl font-serif font-bold text-trad-amber-700 mb-8 leading-tight">
                        Hồi Ức Trầm Hương – <br />
                        <span className="text-trad-text-main">Nơi Sản Phẩm Thức Tỉnh</span>
                    </h2>

                    <div className="max-h-[600px] overflow-y-auto pr-6 custom-scrollbar space-y-6">
                        <div className="prose prose-lg text-trad-text-main/80 font-serif text-justify border-l-4 border-trad-amber-200 pl-6">
                            <p className="leading-relaxed">
                                {storyText}
                            </p>
                            <p>
                                Từ những cánh rừng già bạt ngàn gió núi, cây Dó Bầu chịu thương chịu khó qua năm tháng, tích tụ nhựa thơm từ vết thương trên thân mình. Đó là sự chữa lành kỳ diệu của thiên nhiên. Người đi điệu (tìm trầm) phải băng rừng lội suối, ăn gió nằm sương mới tìm được những mảnh trầm quý giá.
                            </p>
                            <p>
                                Tại xưởng chế tác của chúng tôi, những người thợ lành nghề với đôi bàn tay khéo léo, cẩn trọng mài giũa, chọn lọc từng thớ gỗ. Không máy móc công nghiệp ồn ào, chỉ có tiếng đục đẽo khe khẽ và mùi hương thoang thoảng lan tỏa. Đó là sự tôn trọng tuyệt đối với tặng phẩm của trời đất.
                            </p>
                            <p>
                                Khi bạn thắp lên nén nhang này, bạn không chỉ ngửi thấy mùi hương, mà còn cảm nhận được cả một hành trình dài đầy gian nan nhưng cũng đầy tự hào. Đó là hồn cốt Việt, là sự an yên tìm về giữa bộn bề cuộc sống.
                            </p>
                        </div>

                        <div className="mt-8 italic text-trad-text-muted text-sm text-center">
                            * Cuộn xuống để đọc tiếp câu chuyện *
                        </div>
                    </div>
                </div>

                {/* Right: Visual Storytelling (Silk Painting Style Placeholders) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="relative aspect-[3/4] rounded-t-full rounded-b-lg overflow-hidden border-2 border-trad-amber-700/20 shadow-xl bg-trad-bg-warm">
                        <div className="absolute inset-0 flex items-center justify-center flex-col text-trad-amber-800/40">
                            <span className="material-symbols-outlined text-6xl mb-2">forest</span>
                            <span className="font-serif italic">Rừng thiêng</span>
                        </div>
                    </div>
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-trad-amber-700/20 shadow-lg bg-white rotate-2 hover:rotate-0 transition-transform duration-500">
                        <div className="absolute inset-0 flex items-center justify-center flex-col text-trad-amber-800/40">
                            <span className="material-symbols-outlined text-6xl mb-2">handyman</span>
                            <span className="font-serif italic">Chế tác thủ công</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
