import { fetchWithAuth, buildUrl } from './base-http';

import { Contact } from '@/types/contact';

export interface ContactData {
    full_name: string;
    email: string;
    topic?: string;
    message: string;
}

// Contact interface moved to @/types/contact
export type { Contact };

export interface ContactMeta {
    total: number;
    page?: number;
    limit?: number;
}

export const contactService = {
    submitContact: async (data: ContactData) => {
        const url = buildUrl('/contacts');
        // Contact is a public endpoint, but fetchWithAuth handles public POSTs fine if configured,
        // or we can ensure it doesn't fail on missing token. 
        // Our base-http usually attaches token if available, but for public endpoints it should work without auth if backend allows.
        // The backend uses @Throttle but NO @UseGuards(AuthGuard) on the controller, so it's public.
        return fetchWithAuth(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    getContacts: async (page = 1, limit = 10) => {
        const url = buildUrl('/contacts', { page, limit });
        return fetchWithAuth<{ data: Contact[], meta: ContactMeta }>(url);
    },

    updateContactStatus: async (id: string, status: string) => {
        const url = buildUrl(`/contacts/${id}`);
        return fetchWithAuth(url, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }
};

export const { submitContact, getContacts, updateContactStatus } = contactService;
