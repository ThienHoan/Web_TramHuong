export const localeCookie = {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax' as const,
};

export function resolveRootLocale({
    isBot,
    preferredLocale,
    acceptLanguage,
}: {
    isBot: boolean;
    preferredLocale?: string;
    acceptLanguage: string | null;
}): 'vi' | 'en' {
    // Crawlers always see the Vietnamese default, independent of their headers/cookies.
    if (isBot) return 'vi';
    if (preferredLocale === 'vi' || preferredLocale === 'en') return preferredLocale;

    // Vietnamese anywhere in the accepted list wins, even when English ranks first.
    const acceptsVietnamese = acceptLanguage?.split(',').some((entry) => {
        const [language, ...parameters] = entry.trim().split(';');
        if (!/^vi(?:-[a-z0-9]+)*$/i.test(language.trim())) return false;
        const quality = parameters.map((parameter) => parameter.trim()).find((parameter) => /^q\s*=/i.test(parameter));
        const weight = quality === undefined ? 1 : Number(quality.split('=')[1]);
        return weight > 0 && weight <= 1;
    });

    return acceptsVietnamese ? 'vi' : 'en';
}
