'use client';

import Image, { ImageProps } from 'next/image';

interface ProductImageProps extends Omit<ImageProps, 'src'> {
    src?: string;
    fallback?: string;
}

export default function ProductImage({ src, alt, className, ...props }: ProductImageProps) {
    // Mock logic: In real app, we'd have blurHash or small data URL
    const validSrc = src || '/placeholder-bracelet.jpg'; // Using a robust fallback

    return (
        <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
            <Image
                src={validSrc}
                alt={alt || "Product image"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-opacity duration-500 opacity-0 animate-[fadeIn_0.5s_ease-in_forwards]"
                onLoad={(event) => {
                    const img = event.target as HTMLImageElement;
                    img.classList.remove('opacity-0');
                }}
                onError={(event) => {
                    const img = event.target as HTMLImageElement;
                    // Prevent infinite loop if fallback also fails
                    if (img.src.indexOf('placeholder') === -1) {
                        img.src = '/placeholder-bracelet.jpg';
                    }
                }}
                priority={false} // Lazy by default
                {...props}
            />
        </div>
    );
}
