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
        admin?: boolean;
        sort?: string;
    }): Promise<BlogResult> => {
        const queryParams: Record<string, string | number | boolean | undefined> = {};
        if (options?.page) queryParams.page = options.page;
        if (options?.limit) queryParams.limit = options.limit;
        if (options?.category) queryParams.category = options.category;
        if (options?.search) queryParams.search = options.search;
        if (options?.status) queryParams.status = options.status;
        if (options?.sort) queryParams.sort = options.sort;

        try {
            const admin = options?.admin || (!!options?.status && options.status !== 'published');
            const url = buildUrl(admin ? '/posts/admin/list' : '/posts', queryParams);
            const result = await fetchWithAuth<{ data: BlogPost[], meta: Partial<BlogMeta> & { last_page?: number } }>(url);
            const defaultMeta: BlogMeta = { total: 0, page: 1, limit: 10, currentPage: 1, totalPages: 1, totalItems: 0 };
            // A published post saved without a URL handle has no page of its own; linking it
            // would point at "/blog/" (the list) and send that URL to Google. Admin still sees it.
            const data = (result.data || []).filter(post => admin || !!post.slug?.trim());
            const raw = result.meta || {};
            const page = raw.page || raw.currentPage || options?.page || 1;
            const total = raw.total ?? raw.totalItems ?? 0;
            const limit = raw.limit || options?.limit || 10;
            const meta: BlogMeta = { ...defaultMeta, total, page, limit, currentPage: page,
                totalItems: total, totalPages: raw.last_page || raw.totalPages || Math.max(1, Math.ceil(total / limit)) };
            return { data, meta, error: undefined };
        } catch (e: unknown) {
            console.error('[blogService.getPosts]', e);
            const message = e instanceof Error ? e.message : 'Failed to load posts';
            const defaultMeta: BlogMeta = { total: 0, page: 1, limit: 10, currentPage: 1, totalPages: 1, totalItems: 0 };
            return { data: [], meta: defaultMeta, error: message };
        }
    },

    getPostBySlug: async (slug: string, admin = false): Promise<{ data: BlogPost | null; error?: string }> => {
        try {
            const url = buildUrl(admin ? `/posts/admin/${slug}` : `/posts/${slug}`);
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

