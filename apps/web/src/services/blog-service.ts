import { fetchWithAuth, buildUrl } from './base-http';
import { BlogPost } from '@/types/blog';

export interface BlogMeta {
    total: number;
    page: number;
    limit: number;
    currentPage: number;
    totalPages: number;
    totalItems: number;
}

export interface BlogResult {
    data: BlogPost[];
    meta: BlogMeta;
    error?: string;
}

export const blogService = {
    getPosts: async (options?: {
        page?: number;
        limit?: number;
        category?: string;
        search?: string;
        status?: string;
    }): Promise<BlogResult> => {
        const queryParams: Record<string, string | number | boolean | undefined> = {};
        if (options?.page) queryParams.page = options.page;
        if (options?.limit) queryParams.limit = options.limit;
        if (options?.category) queryParams.category = options.category;
        if (options?.search) queryParams.search = options.search;
        if (options?.status) queryParams.status = options.status;

        try {
            const url = buildUrl('/posts', queryParams);
            const result = await fetchWithAuth<{ data: BlogPost[], meta: BlogMeta }>(url);
            const defaultMeta: BlogMeta = { total: 0, page: 1, limit: 10, currentPage: 1, totalPages: 1, totalItems: 0 };
            return { data: result.data || [], meta: result.meta || defaultMeta, error: undefined };
        } catch (e: unknown) {
            console.error('[blogService.getPosts]', e);
            const message = e instanceof Error ? e.message : 'Failed to load posts';
            const defaultMeta: BlogMeta = { total: 0, page: 1, limit: 10, currentPage: 1, totalPages: 1, totalItems: 0 };
            return { data: [], meta: defaultMeta, error: message };
        }
    },

    getPostBySlug: async (slug: string): Promise<{ data: BlogPost | null; error?: string }> => {
        try {
            const url = buildUrl(`/posts/${slug}`);
            const data = await fetchWithAuth<BlogPost>(url);
            return { data, error: undefined };
        } catch (e: unknown) {
            console.error('[blogService.getPostBySlug]', e);
            const message = e instanceof Error ? e.message : 'Post not found';
            return { data: null, error: message };
        }
    },

    createPost: async (data: Partial<BlogPost>) => {
        const url = buildUrl('/posts');
        return fetchWithAuth<BlogPost>(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    updatePost: async (id: string, data: Partial<BlogPost>) => {
        const url = buildUrl(`/posts/${id}`);
        return fetchWithAuth<BlogPost>(url, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    deletePost: async (id: string) => {
        const url = buildUrl(`/posts/${id}`);
        return fetchWithAuth(url, {
            method: 'DELETE'
        });
    }
};

// Re-export for easier imports
export const { getPosts, getPostBySlug, createPost, updatePost, deletePost } = blogService;

