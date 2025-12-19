const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getProducts(locale: string): Promise<any[]> {
    try {
        const res = await fetch(`${API_URL}/products?locale=${locale}`, {
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        if (!res.ok) {
            console.error(`Status ${res.status}: Failed to fetch products`);
            return [];
        }

        const data = await res.json();
        return data;
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
