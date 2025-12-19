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
        return await res.json();
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

export async function createOrder(items: { productId: string; quantity: number }[]) {
    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error('Failed to create order');
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
        return await res.json();
    } catch (e) {
        console.error("Fetch Orders Error:", e);
        return [];
    }
}
