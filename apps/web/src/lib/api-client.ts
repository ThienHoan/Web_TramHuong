const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let accessToken = '';

export function setAccessToken(token: string) {
    accessToken = token;
}

const getHeaders = () => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
};

async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const headers = { ...getHeaders(), ...(options.headers as any) };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        // Safe json parsing
        try {
            const err = await res.json();
            throw new Error(err.message || 'Request failed');
        } catch (e: any) {
            throw new Error(res.statusText || 'Request failed');
        }
    }
    // Safe response parsing
    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

export async function getProducts(locale: string): Promise<any[]> {
    try {
        const res = await fetch(`${API_URL}/products?locale=${locale}`, {
            next: { revalidate: 60 }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.data || []);
    } catch (e) {
        console.error("Fetch Error:", e);
        return [];
    }
}

export async function getProduct(slug: string, locale: string): Promise<any> {
    try {
        const res = await fetch(`${API_URL}/products/${slug}?locale=${locale}`, {
            next: { revalidate: 60 }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Fetch Error:", e);
        return null;
    }
}

export async function createOrder(items: { productId: string; quantity: number }[], shippingInfo: any, paymentMethod: string = 'cod') {
    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ items, shipping_info: shippingInfo, paymentMethod }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to create order');
        }
        return await res.json();
    } catch (e) {
        console.error("Create Order Error:", e);
        throw e;
    }
}

export async function getMyOrders() {
    try {
        const res = await fetch(`${API_URL}/orders/me`, {
            headers: getHeaders(),
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.data || []);
    } catch (e) {
        console.error("Fetch Orders Error:", e);
        return [];
    }
}

export async function getOrder(id: string) {
    try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            headers: getHeaders(),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("Fetch Order Error:", e);
        return null;
    }
}

export async function getCategories(locale: string = 'en', includeInactive: boolean = false) {
    try {
        const res = await fetch(`${API_URL}/categories?locale=${locale}&include_inactive=${includeInactive}`, {
            headers: getHeaders(),
            next: { revalidate: 60 }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data.data || []);
    } catch (e) {
        console.error("Fetch Categories Error:", e);
        return [];
    }
}
export async function getReviews(productId: string) {
    try {
        const res = await fetch(`${API_URL}/reviews/${productId}`, {
            next: { revalidate: 0 } // Always fresh
        });
        if (!res.ok) return { data: [], meta: { total: 0, average: 0, distribution: {} } };
        return await res.json();
    } catch (e) {
        console.error("Fetch Reviews Error:", e);
        return { data: [], meta: { total: 0, average: 0, distribution: {} } };
    }
}

export async function createReview(productId: string, rating: number, comment: string) {
    try {
        const res = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ productId, rating, comment }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to submit review');
        }
        return await res.json();
    } catch (e) {
        console.error("Create Review Error:", e);
        throw e;
    }
}

export async function seedReview(data: any) {
    try {
        const res = await fetch(`${API_URL}/reviews/seed`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to seed review');
        }
        return await res.json();
    } catch (e) {
        console.error("Seed Review Error:", e);
        throw e;
    }
}

export async function getProfile() {
    return fetchWithAuth(`${API_URL}/users/profile`, {
        method: 'GET'
    });
}

export async function updateProfile(data: any) {
    return fetchWithAuth(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
}

export async function getMyReviews() {
    return fetchWithAuth(`${API_URL}/reviews/user/me`, {
        method: 'GET'
    });
}

export async function updateReview(id: string, data: any) {
    // Ideally use fetchWithAuth and PATCH endpoint. 
    // Assuming backend endpoint exists or will exist.
    return fetchWithAuth(`${API_URL}/reviews/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
}

export async function deleteReview(id: string) {
    try {
        const res = await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to delete review');
        }
        return await res.json();
    } catch (e) {
        console.error("Delete Review Error:", e);
        throw e;
    }
}

// Wishlist
export async function toggleWishlist(productId: string) {
    return fetchWithAuth(`${API_URL}/wishlist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() } as any,
        body: JSON.stringify({ productId }),
    });
}

export async function getWishlist() {
    return fetchWithAuth(`${API_URL}/wishlist`, { method: 'GET' });
}

export async function getLikedIds() {
    try {
        const res = await fetch(`${API_URL}/wishlist/ids`, {
            headers: getHeaders(),
        });
        if (!res.ok) return []; // Fail silent
        return await res.json();
    } catch (e) {
        return [];
    }
}
