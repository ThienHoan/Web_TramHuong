// Re-export new modular types to replace old monolithic types file
export * from '../types/product';
export * from '../types/order';
export * from '../types/user';
export * from '../types/review';

// Aliases for backward compatibility if names differ
// (Most names like Product, Category, Order are same)

export interface User {
    // Legacy User interface had these fields. 
    // New UserProfile has different naming? 
    // Let's check user.ts. UserProfile has full_name, role etc.
    // Legacy had shipping_address. 
    id: string;
    email: string;
    full_name?: string;
    phone_number?: string;
    shipping_address?: string;
    avatar_url?: string;
    role: 'ADMIN' | 'STAFF_ORDER' | 'STAFF_PRODUCT' | 'CUSTOMER' | 'USER' | 'STAFF';
}
