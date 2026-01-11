import { buildUrl, fetchWithAuth } from './base-http';
import { Product, Category } from '../types/product';

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    last_page: number;
}

interface ProductApiResponse {
    data?: Product[];
    meta?: PaginationMeta;
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
        page?: number;
    }): Promise<Product[]> {
        const { data } = await this.getProductsPaginated(locale, options);
        return data;
    },

    async getProductsPaginated(locale: string, options?: {
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
        page?: number;
    }): Promise<{ data: Product[]; meta?: PaginationMeta }> {
        try {
            const params: Record<string, string | number | boolean | undefined> = { locale, ...options };
            if (options?.include_inactive) params.include_inactive = 'true';
            if (options?.is_featured !== undefined) params.is_featured = String(options.is_featured);
            if (options?.categoryId) params.category_id = options.categoryId;

            const url = buildUrl('/products', params);

            // varying cache based on page number might be tricky for static gen, 
            // but for dynamic search params Next.js usually handles it.
            const data = await fetchWithAuth<Product[] | ProductApiResponse>(url, { next: { revalidate: 120, tags: ['products'] } });

            if (Array.isArray(data)) {
                // Should not happen if backend returns meta, but for safety
                return {
                    data: data.map((p: Product) => ({ ...p, stock: p.quantity ?? 0 })),
                    meta: undefined
                };
            }

            const items: Product[] = data.data || [];
            const mappedItems = items.map((p: Product) => ({ ...p, stock: p.quantity ?? 0 }));

            return {
                data: mappedItems,
                meta: data.meta
            };
        } catch (e) {
            console.error("Fetch Error:", e);
            return { data: [], meta: undefined };
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
