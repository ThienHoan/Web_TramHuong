import { fetchWithAuth, buildUrl } from './base-http';
import { BlogPost } from '@/types/blog';

export interface BlogResult {
    data: BlogPost[];
    meta: any;
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
        const queryParams: Record<string, any> = {};
        if (options?.page) queryParams.page = options.page;
        if (options?.limit) queryParams.limit = options.limit;
        if (options?.category) queryParams.category = options.category;
        if (options?.search) queryParams.search = options.search;
        if (options?.status) queryParams.status = options.status;

        try {
            const url = buildUrl('/posts', queryParams);
            const result = await fetchWithAuth<{ data: BlogPost[], meta: any }>(url);
            return { data: result.data || [], meta: result.meta || {}, error: undefined };
        } catch (e: any) {
            console.error('[blogService.getPosts]', e);
            return { data: [], meta: { total: 0 }, error: e.message || 'Failed to load posts' };
        }
    },

    getPostBySlug: async (slug: string): Promise<{ data: BlogPost | null; error?: string }> => {
        try {
            const url = buildUrl(`/posts/${slug}`);
            const data = await fetchWithAuth<BlogPost>(url);
            return { data, error: undefined };
        } catch (e: any) {
            console.error('[blogService.getPostBySlug]', e);
            return { data: null, error: e.message || 'Post not found' };
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

