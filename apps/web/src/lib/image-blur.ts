/**
 * Generate shimmer effect as base64 data URL for blur placeholder
 * @param w Width of the shimmer
 * @param h Height of the shimmer
 * @returns Base64 encoded SVG data URL
 */
export function getShimmerDataURL(w: number = 600, h: number = 400): string {
    const shimmer = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shimmer-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#f6f7f8" />
          <stop offset="20%" stop-color="#edeef1" />
          <stop offset="40%" stop-color="#f6f7f8" />
          <stop offset="100%" stop-color="#f6f7f8" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f6f7f8" />
      <rect width="${w}" height="${h}" fill="url(#shimmer-gradient)">
        <animate 
          attributeName="x" 
          from="-${w}" 
          to="${w}" 
          dur="1.2s" 
          repeatCount="indefinite" 
        />
      </rect>
    </svg>
  `;

    const toBase64 = (str: string) =>
        typeof window === 'undefined'
            ? Buffer.from(str).toString('base64')
            : window.btoa(str);

    return `data:image/svg+xml;base64,${toBase64(shimmer)}`;
}

/**
 * Generate solid color blur placeholder (lighter, faster fallback)
 * @param color Hex color code (e.g., '#f3f4f6')
 * @returns Base64 encoded SVG data URL
 */
export function getSolidColorDataURL(color: string = '#f3f4f6'): string {
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${color}"/></svg>`;

    const toBase64 = (str: string) =>
        typeof window === 'undefined'
            ? Buffer.from(str).toString('base64')
            : window.btoa(str);

    return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

/**
 * Pre-generated shimmer data URLs for common sizes
 */
export const SHIMMER_PRESETS = {
    hero: getShimmerDataURL(1920, 1080),
    card: getShimmerDataURL(600, 800),
    avatar: getShimmerDataURL(128, 128),
    thumbnail: getShimmerDataURL(400, 300),
    landscape: getShimmerDataURL(800, 450),
    square: getShimmerDataURL(600, 600),
} as const;
