const API_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

let accessToken = '';

export function setAccessToken(token: string) {
    accessToken = token;
}

export const getHeaders = () => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (accessToken && accessToken.trim() !== '') {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
};

export async function fetchWithAuth<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = { ...getHeaders(), ...(options.headers as Record<string, string>) };
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        // Safe json parsing
        try {
            const err = await res.json() as { message?: string };
            throw new Error(err.message || 'Request failed');
        } catch (_e: unknown) {
            throw new Error(res.statusText || 'Request failed');
        }
    }

    // Safe response parsing
    const text = await res.text();
    if (!text) return {} as T;

    try {
        return JSON.parse(text) as T;
    } catch (_parseError) {
        console.error('[fetchWithAuth] Failed to parse JSON response:', text.substring(0, 200));
        throw new Error('Unexpected response format from server');
    }
}

export function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    // Determine base for URL construction. 
    // If API_URL is relative (starts with /), we need a dummy base or window.location.origin to use URL constructor safely.
    // However, checking for http protocol is safer.
    const isAbsolute = API_URL.startsWith('http');
    const base = isAbsolute ? API_URL : 'http://dummy-base.com' + API_URL;

    const url = new URL(`${base}${path}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
    }

    if (isAbsolute) {
        return url.toString();
    } else {
        // Return relative path (e.g., /api/products?foo=bar)
        return url.pathname + url.search;
    }
}

export { API_URL };
