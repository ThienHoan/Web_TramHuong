import { fetchWithAuth, buildUrl } from './base-http';
import { BlogPost } from '@/types/blog';

export const blogService = {
    getPosts: async (options?: {
        page?: number;
        limit?: number;
        category?: string;
        search?: string;
    }) => {
        const queryParams: Record<string, any> = {};
        if (options?.page) queryParams.page = options.page;
        if (options?.limit) queryParams.limit = options.limit;
        if (options?.category) queryParams.category = options.category;
        if (options?.search) queryParams.search = options.search;

        const url = buildUrl('/posts', queryParams);
        return fetchWithAuth<{ data: BlogPost[], meta: any }>(url);
    },

    getPostBySlug: async (slug: string) => {
        const url = buildUrl(`/posts/${slug}`);
        return fetchWithAuth<BlogPost>(url);
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
