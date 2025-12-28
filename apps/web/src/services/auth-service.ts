import { fetchWithAuth, API_URL } from './base-http';
import { UserProfile } from '../types/user';

export const authService = {
    async getProfile(): Promise<UserProfile> {
        return fetchWithAuth<UserProfile>(`${API_URL}/users/profile`, {
            method: 'GET'
        });
    },

    async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
        return fetchWithAuth<UserProfile>(`${API_URL}/users/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
    }
};
