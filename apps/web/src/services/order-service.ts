import { fetchWithAuth, getHeaders, API_URL } from './base-http';
import { CreateOrderDto, Order } from '../types/order';

export const orderService = {
    async createOrder(data: CreateOrderDto): Promise<Order> {
        try {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create order');
            }
            return await res.json();
        } catch (e) {
            console.error("Create Order Error:", e);
            throw e;
        }
    },

    async getMyOrders(page = 1, limit = 10): Promise<{ data: Order[]; meta: any }> {
        try {
            const res = await fetch(`${API_URL}/orders/me?page=${page}&limit=${limit}`, {
                headers: getHeaders(),
            });
            if (!res.ok) return { data: [], meta: {} };
            const response = await res.json();
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
            return await res.json();
        } catch (e) {
            console.error("Fetch Order Error:", e);
            return null;
        }
    }
};
