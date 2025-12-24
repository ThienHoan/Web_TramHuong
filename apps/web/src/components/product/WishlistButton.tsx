'use client';

import { useWishlist } from '../providers/WishlistProvider';
import { useState } from 'react';

export default function WishlistButton({ productId, className = '' }: { productId: string, className?: string }) {
    const { items, toggle } = useWishlist();
    const isLiked = items.has(productId);
    const [loading, setLoading] = useState(false); // Added loading state

    const handleClick = async (e: React.MouseEvent) => { // Moved handleClick definition outside JSX
        e.preventDefault();
        e.stopPropagation();
        if (loading) return;
        setLoading(true);
        await toggle(productId);
        setLoading(false);
    };

    return (
        <button
            onClick={handleClick} // Used the defined handleClick function
            className={`p-2 rounded-full transition-all hover:bg-gray-100 ${className} group`}
            title={isLiked ? "Remove from wishlist" : "Add to wishlist"}
            disabled={loading} // Added disabled state based on loading
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={isLiked ? "red" : "none"}
                stroke={isLiked ? "red" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${isLiked ? 'scale-110' : 'group-hover:scale-110'}`}
            >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
        </button>
    );
}
