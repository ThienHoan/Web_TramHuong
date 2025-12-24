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
