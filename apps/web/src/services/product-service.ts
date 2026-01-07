import { buildUrl, fetchWithAuth } from './base-http';
import { Product, Category } from '../types/product';

interface ProductApiResponse {
    data?: Product[];
}

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
            const params: Record<string, string | number | boolean | undefined> = { locale, ...options };
            if (options?.include_inactive) params.include_inactive = 'true';
            if (options?.is_featured !== undefined) params.is_featured = String(options.is_featured);
            if (options?.categoryId) params.category_id = options.categoryId; // Map camelCase to snake_case

            const url = buildUrl('/products', params);

            // Cache for 2 minutes, use revalidateTag('products') to clear when admin updates
            const data = await fetchWithAuth<Product[] | ProductApiResponse>(url, { next: { revalidate: 120, tags: ['products'] } });

            const items: Product[] = Array.isArray(data) ? data : (data.data || []);
            // Map quantity to stock to match frontend Type
            return items.map((p: Product) => ({ ...p, stock: p.quantity ?? 0 }));
        } catch (e) {
            console.error("Fetch Error:", e);
            return [];
        }
    },

    async getProduct(slug: string, locale: string): Promise<Product | null> {
        try {
            const url = buildUrl(`/products/${slug}`, { locale });
            const data = await fetchWithAuth<Product>(url, { next: { revalidate: 60 } });

            if (!data) return null;
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
            // revalidate 60s
            const data = await fetchWithAuth<Category[] | { data: Category[] }>(url, { next: { revalidate: 60 } });

            const items: Category[] = Array.isArray(data) ? data : (data.data || []);
            return items;
        } catch (e) {
            console.error("Fetch Categories Error:", e);
            return [];
        }
    }
};
