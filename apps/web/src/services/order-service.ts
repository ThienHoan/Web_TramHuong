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

    async getMyOrders(): Promise<Order[]> {
        try {
            const res = await fetch(`${API_URL}/orders/me`, {
                headers: getHeaders(),
            });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : (data.data || []);
        } catch (e) {
            console.error("Fetch Orders Error:", e);
            return [];
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
