export function safeOAuthReturnPath(value: string | null, locale = 'en'): string {
    const fallback = locale === 'vi' ? '/vi' : '/en';
    if (!value || value.length > 2048) return fallback;
    try {
        const decoded = decodeURIComponent(value);
        // Validate both forms: URL parsers normalize tabs, slashes and backslashes.
        const unsafe = (path: string) => !path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(path);
        if (unsafe(value) || unsafe(decoded)) return fallback;
        const url = new URL(value, 'https://oauth-return.invalid');
        if (url.origin !== 'https://oauth-return.invalid') return fallback;
        return url.pathname + url.search + url.hash;
    } catch {
        return fallback;
    }
}

export function oauthCallbackUrl(origin: string, locale: string): string {
    const url = new URL('/auth/callback', origin);
    url.searchParams.set('next', locale === 'vi' ? '/vi' : '/en');
    return url.href;
}

export function oauthRedirectOrigin(requestUrl: string, configuredSite: string | undefined, nodeEnv: string | undefined): string {
    const requestOrigin = new URL(requestUrl).origin;
    if (nodeEnv === 'development') return requestOrigin;
    const url = new URL(configuredSite || requestOrigin);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
        throw new Error('OAUTH_CANONICAL_ORIGIN_REQUIRED');
    return url.origin;
}
