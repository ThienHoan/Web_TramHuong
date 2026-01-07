export interface ProductVariant {
    id: string;
    sku: string;
    price: number | string;
    attributes: Record<string, string>;
    stock: number;
    name?: string;
}

export interface ProductTranslation {
    locale?: string;
    title: string;
    description?: string;
    short_description?: string;
    story?: string;
    specifications?: string;
}

export interface Product {
    id: string;
    slug: string;
    price: number;
    sale_price?: number;
    images: string[];
    thumbnail?: string;
    stock: number;
    quantity?: number; // Backend returns quantity, we normalize to stock
    is_active: boolean;
    style_affinity?: 'zen' | 'traditional' | 'both';

    discount_percentage?: number;
    discount_start_date?: string | null;
    discount_end_date?: string | null;

    is_featured?: boolean;
    featured_section?: string | null;

    category_id?: string;
    category?: Category;

    created_at: string;
    updated_at: string;

    // Translations
    translation?: ProductTranslation;
    translations?: ProductTranslation[];

    variants?: ProductVariant[];
    // For legacy support or direct access
    title?: string;
    description?: string;
}

export interface CategoryTranslation {
    locale?: string;
    name: string;
    description?: string;
}

export interface Category {
    id: string;
    slug: string;
    is_active: boolean;
    image?: string;

    translation?: CategoryTranslation;
    translations?: CategoryTranslation[];
}
