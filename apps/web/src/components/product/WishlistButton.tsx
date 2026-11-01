'use client';

import { useWishlist } from '../providers/WishlistProvider';
import { useState } from 'react';
import { Heart } from 'lucide-react';

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
            aria-pressed={isLiked} disabled={loading} // Added disabled state based on loading
        >
            <Heart size={24} aria-hidden="true" fill={isLiked ? "red" : "none"} stroke={isLiked ? "red" : "currentColor"} className={`transition-transform duration-200 ${isLiked ? 'scale-110' : 'group-hover:scale-110'}`} />
        </button>
    );
}
