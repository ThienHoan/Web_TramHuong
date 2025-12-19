
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

// Helper to flatten data for frontend usage if needed, 
// though we usually keep it nested to allow switching locales on the fly if we wanted.
// For this project, we fetch based on current locale, so we might return a 'ResolvedProduct'
// but let's stick to the raw shape for now to mimic the Backend response closely.
