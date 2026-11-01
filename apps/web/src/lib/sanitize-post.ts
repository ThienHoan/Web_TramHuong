import sanitizeHtml from 'sanitize-html';

// Apply at render time as well as to new content: existing posts can contain HTML.
export function sanitizePostHtml(html: string): string {
    return sanitizeHtml(html, {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2'],
        allowedAttributes: {
            a: ['href', 'name', 'target', 'rel'],
            img: ['src', 'alt', 'width', 'height', 'loading'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
        },
    });
}
