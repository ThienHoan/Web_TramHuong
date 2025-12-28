import { fetchWithAuth, getHeaders, API_URL } from './base-http';
import { Review, ReviewResponse } from '../types/review';

export const reviewService = {
    async getReviews(productId: string): Promise<ReviewResponse> {
        try {
            const res = await fetch(`${API_URL}/reviews/${productId}`, {
                next: { revalidate: 0 } // Always fresh
            });
            if (!res.ok) return { data: [], meta: { total: 0, average: 0, distribution: {} } };
            return await res.json();
        } catch (e) {
            console.error("Fetch Reviews Error:", e);
            return { data: [], meta: { total: 0, average: 0, distribution: {} } };
        }
    },

    async createReview(productId: string, rating: number, comment: string): Promise<Review> {
        try {
            const res = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ productId, rating, comment }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to submit review');
            }
            return await res.json();
        } catch (e) {
            console.error("Create Review Error:", e);
            throw e;
        }
    },

    async getMyReviews(): Promise<Review[]> {
        return fetchWithAuth<Review[]>(`${API_URL}/reviews/user/me`, {
            method: 'GET'
        });
    },

    async updateReview(id: string, data: any): Promise<Review> {
        return fetchWithAuth<Review>(`${API_URL}/reviews/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
    },

    async deleteReview(id: string): Promise<any> {
        try {
            const res = await fetch(`${API_URL}/reviews/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to delete review');
            }
            return await res.json();
        } catch (e) {
            console.error("Delete Review Error:", e);
            throw e;
        }
    },

    async seedReview(data: any) {
        try {
            const res = await fetch(`${API_URL}/reviews/seed`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to seed review');
            }
            return await res.json();
        } catch (e) {
            console.error("Seed Review Error:", e);
            throw e;
        }
    }
};
