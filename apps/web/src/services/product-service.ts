import { buildUrl, fetchWithAuth } from './base-http';
import { Product, Category } from '../types/product';

export const productService = {
    async getProducts(locale: string, options?: {
        category?: string;
        categoryId?: string | number;
        search?: string;
        sort?: string;
        limit?: number;
        include_inactive?: boolean;
        min_price?: number;
        max_price?: number;
        stock_status?: string;
        is_featured?: boolean;
    }): Promise<Product[]> {
        try {
            const params: Record<string, any> = { locale, ...options };
            if (options?.include_inactive) params.include_inactive = 'true';
            if (options?.is_featured !== undefined) params.is_featured = String(options.is_featured);
            if (options?.categoryId) params.category_id = options.categoryId; // Map camelCase to snake_case for API

            const url = buildUrl('/products', params);

            const res = await fetch(url, { next: { revalidate: 0 } }); // Disable cache for debugging
            if (!res.ok) return [];

            const data = await res.json();
            const items = Array.isArray(data) ? data : (data.data || []);
            // Map quantity to stock to match frontend Type
            return items.map((p: any) => ({ ...p, stock: p.quantity ?? 0 }));
        } catch (e) {
            console.error("Fetch Error:", e);
            return [];
        }
    },

    async getProduct(slug: string, locale: string): Promise<Product | null> {
        try {
            const url = buildUrl(`/products/${slug}`, { locale });
            const res = await fetch(url, { next: { revalidate: 60 } });
            if (!res.ok) return null;
            const data = await res.json();
            // Map quantity to stock
            return { ...data, stock: data.quantity ?? 0 };
        } catch (e) {
            console.error("Fetch Error:", e);
            return null;
        }
    },

    async getCategories(locale: string = 'en', includeInactive: boolean = false): Promise<Category[]> {
        try {
            const url = buildUrl('/categories', { locale, include_inactive: includeInactive });
            const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, next: { revalidate: 60 } });

            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : (data.data || []);
        } catch (e) {
            console.error("Fetch Categories Error:", e);
            return [];
        }
    }
};
