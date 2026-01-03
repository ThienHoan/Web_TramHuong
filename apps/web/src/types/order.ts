export type OrderStatus = 'PENDING' | 'AWAITING_PAYMENT' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELED' | 'EXPIRED';

export interface OrderItem {
    id?: string;
    product_id: string;
    variant_id?: string;
    variant_name?: string;
    quantity: number;
    price: number;
    total: number;
    // Expanded details
    title?: string;
    image?: string;
    // Discount details
    original_price?: number;
    discount_amount?: number;
}

export interface ShippingInfo {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district?: string;
    ward?: string;
    shipping_fee?: number;
    method?: string;
}

export interface Order {
    id: string;
    user_id?: string;
    status: OrderStatus;
    total: number;
    subtotal?: number; // Calculated on frontend usually

    items: OrderItem[];
    shipping_info: ShippingInfo;

    payment_method: string;
    payment_status?: string;
    payment_url?: string;
    payment_deadline?: string;
    expired_at?: string;

    created_at: string;
    updated_at: string;
}

export interface CreateOrderDto {
    items: {
        productId: string;
        quantity: number;
        variantId?: string;
        variantName?: string;
    }[];
    shipping_info: ShippingInfo;
    paymentMethod: string;
    voucherCode?: string;
}
