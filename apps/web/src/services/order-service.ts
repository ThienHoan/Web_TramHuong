import { getHeaders, API_URL } from './base-http';
import { CreateOrderDto, Order } from '../types/order';
import { prepareCheckoutAttempt, completeCheckoutAttempt, checkoutErrorMessage } from '../lib/checkout-attempt';

const inFlight = new Map<string, Promise<Order>>();

export interface OrderMeta {
    total?: number;
    page?: number;
    limit?: number;
}

export const orderService = {
    async createOrder(data: CreateOrderDto, ownerId: string | null = null): Promise<Order> {
        const en = typeof window !== 'undefined' && window.location.pathname.startsWith('/en/');
        let key: string;
        try { key = await prepareCheckoutAttempt(data, ownerId); }
        catch { throw new Error(checkoutErrorMessage('CHECKOUT_STORAGE_UNAVAILABLE', en)); }
        const current = inFlight.get(key);
        if (current) return current;
        const task = (async () => {
          try {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ ...data, idempotencyKey: key }),
            });
            if (!res.ok) {
                const err = await res.json() as { message?: string };
                throw new Error(checkoutErrorMessage(err.message || 'CHECKOUT_RESULT_UNKNOWN', en));
            }
            const order = await res.json() as Order;
            if (!order || typeof order.id !== 'string') throw new Error(checkoutErrorMessage('CHECKOUT_RESULT_UNKNOWN',en));
            completeCheckoutAttempt(key);
            return order;
          } catch (error) {
            if (error instanceof TypeError) throw new Error(checkoutErrorMessage('CHECKOUT_RESULT_UNKNOWN',en));
            throw error;
          }
        })();
        inFlight.set(key,task);
        try { return await task; } finally { inFlight.delete(key); }
    },

    async getMyOrders(page = 1, limit = 10): Promise<{ data: Order[]; meta: OrderMeta }> {
        try {
            const res = await fetch(`${API_URL}/orders/me?page=${page}&limit=${limit}`, {
                headers: getHeaders(),
            });
            if (!res.ok) return { data: [], meta: {} };
            const response = await res.json() as Order[] | { data: Order[]; meta: OrderMeta };
            // Handle both legacy array return (if backend changes) or new paginated object
            if (Array.isArray(response)) {
                return { data: response, meta: {} };
            }
            return response; // { data: [...], meta: {...} }
        } catch (e) {
            console.error("Fetch Orders Error:", e);
            return { data: [], meta: {} };
        }
    },

    async getOrder(id: string): Promise<Order | null> {
        try {
            const res = await fetch(`${API_URL}/orders/${id}`, {
                headers: getHeaders(),
            });
            if (!res.ok) return null;
            return await res.json() as Order;
        } catch (e) {
            console.error("Fetch Order Error:", e);
            return null;
        }
    },

    // Public endpoint for guest users (no auth required)
    async getOrderStatus(id: string): Promise<Partial<Order> | null> {
        try {
            const res = await fetch(`${API_URL}/orders/status/${id}`);
            if (!res.ok) return null;
            return await res.json() as Partial<Order>;
        } catch (e) {
            console.error("Fetch Order Status Error:", e);
            return null;
        }
    }
};
