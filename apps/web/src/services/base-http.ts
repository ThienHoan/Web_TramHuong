const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let accessToken = '';

export function setAccessToken(token: string) {
    accessToken = token;
}

export const getHeaders = () => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
};

export async function fetchWithAuth<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = { ...getHeaders(), ...(options.headers as any) };
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        // Safe json parsing
        try {
            const err = await res.json();
            throw new Error(err.message || 'Request failed');
        } catch (e: any) {
            throw new Error(res.statusText || 'Request failed');
        }
    }

    // Safe response parsing
    const text = await res.text();
    return text ? JSON.parse(text) : {} as T;
}

export function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${API_URL}${path}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
    }
    return url.toString();
}

export { API_URL };
