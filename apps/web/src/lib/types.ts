
export interface ProductTranslation {
    locale: 'en' | 'vi';
    title: string;
    description: string; // Short description
    story?: string;      // Zen: long form storytelling
    specifications?: string; // Traditional: detailed specs
}

export interface Product {
    id: string;
    slug: string;
    price: number;
    images: string[];
    style_affinity: 'zen' | 'traditional' | 'both';
    is_active: boolean;
    translations: ProductTranslation[];
}

// For this project, we fetch based on current locale, so we might return a 'ResolvedProduct'
// but let's stick to the raw shape for now to mimic the Backend response closely.

export interface User {
    id: string;
    email: string;
    full_name?: string;
    phone_number?: string;
    shipping_address?: string;
    avatar_url?: string;
    role: 'ADMIN' | 'STAFF_ORDER' | 'STAFF_PRODUCT' | 'CUSTOMER';
}

export interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    product?: {
        slug: string;
        images: string[];
    };
}

export interface Order {
    id: string;
    created_at: string;
    status: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
    total_amount: number;
    items: OrderItem[];
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
}

export interface CategoryTranslation {
    locale: 'en' | 'vi';
    name: string;
    description: string;
}

export interface Category {
    id: string;
    slug: string;
    is_active: boolean;
    translations?: CategoryTranslation[]; // Helper for frontend
    translation?: CategoryTranslation;   // Flattened structure
}

