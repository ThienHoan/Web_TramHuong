'use client';

import { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    animation?: 'fade-up' | 'fade-in' | 'slide-in-right' | 'slide-in-left' | 'zoom-in' | 'fade-left' | 'fade-right';
    delay?: number; // ms
    duration?: number; // ms
    threshold?: number; // 0-1
    once?: boolean;
}

export default function ScrollReveal({
    children,
    className = "",
    animation = 'fade-up',
    delay = 0,
    duration = 800,
    threshold = 0.2,
    once = true
}: ScrollRevealProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) observer.disconnect();
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold }
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [threshold, once]);

    // Construct style object
    const style = {
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0, 0) scale(1)' : getInitialTransform(animation),
        filter: isVisible ? 'blur(0)' : 'blur(4px)', // Slight blur for dreamy effect
    };

    return (
        <div
            ref={ref}
            className={`${className} transition-all ease-out will-change-transform`}
            style={style}
        >
            {children}
        </div>
    );
}

function getInitialTransform(animation: string) {
    switch (animation) {
        case 'fade-up': return 'translateY(40px)';
        case 'fade-in': return 'scale(0.95)';
        case 'slide-in-right': return 'translateX(-50px)';
        case 'slide-in-left': return 'translateX(50px)';
        case 'fade-right': return 'translateX(-30px)';
        case 'fade-left': return 'translateX(30px)';
        case 'zoom-in': return 'scale(0.8)';
        default: return 'translateY(20px)';
    }
}
