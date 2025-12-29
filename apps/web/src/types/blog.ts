export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt?: string;
    content?: string;
    cover_image?: string;
    created_at: string;
    published_at?: string;
    author_id?: string;
    category?: string;
    tags?: string[];
    is_featured?: boolean;
    seo_title?: string;
    seo_description?: string;
    status: 'draft' | 'published';
    author?: {
        full_name?: string;
        avatar_url?: string;
    };
}
