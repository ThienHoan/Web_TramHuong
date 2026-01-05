'use client';

import { Phone, Truck, Gift, Sparkles } from 'lucide-react';

export default function TopBar() {
    const messages = [
        { icon: Truck, text: "Miễn phí vận chuyển đơn từ 300.000 ₫" },
        { icon: Phone, text: "Hotline: 0356.176.878" },
        { icon: Gift, text: "Quà tặng đặc biệt cho đơn hàng đầu tiên" },
        { icon: Sparkles, text: "Trầm hương thiên nhiên 100%" },
    ];

    // Render a single set of messages
    const MessageSet = () => (
        <>
            {messages.map((item, idx) => (
                <span key={idx} className="inline-flex items-center gap-2 text-white/90 shrink-0">
                    <item.icon size={14} className="text-amber-300" />
                    <span>{item.text}</span>
                    <span className="text-amber-400 mx-8">✦</span>
                </span>
            ))}
        </>
    );

    return (
        <div className="bg-trad-red-900 text-white text-xs py-2 overflow-hidden relative">
            <div className="flex items-center gap-0 animate-scroll hover:[animation-play-state:paused]">
                {/* Triple the content for truly seamless loop */}
                <div className="flex items-center shrink-0">
                    <MessageSet />
                </div>
                <div className="flex items-center shrink-0">
                    <MessageSet />
                </div>
                <div className="flex items-center shrink-0">
                    <MessageSet />
                </div>
            </div>

            <style jsx>{`
                @keyframes scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-33.333%);
                    }
                }
                .animate-scroll {
                    animation: scroll 20s linear infinite;
                    width: max-content;
                }
            `}</style>
        </div>
    );
}
