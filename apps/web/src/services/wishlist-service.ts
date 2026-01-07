import { fetchWithAuth, getHeaders, API_URL } from './base-http';

export const wishlistService = {
    async toggleWishlist(productId: string) {
        return fetchWithAuth(`${API_URL}/wishlist/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
        });
    },

    async getWishlist() {
        return fetchWithAuth(`${API_URL}/wishlist`, { method: 'GET' });
    },

    async getLikedIds(): Promise<string[]> {
        try {
            const res = await fetch(`${API_URL}/wishlist/ids`, {
                headers: getHeaders(),
            });
            if (!res.ok) return [];
            return await res.json();
        } catch (_e) {
            return [];
        }
    }
};
