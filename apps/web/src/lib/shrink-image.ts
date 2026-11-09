/** The API rejects larger uploads. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Largest original accepted before shrinking; camera photos are usually 6-20 MB. */
export const MAX_SOURCE_IMAGE_BYTES = 50 * 1024 * 1024;

const SHRINKABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
// The server stores at most 1600px, so none of these steps lowers what the website shows.
const STEPS = [
    { edge: 2400, quality: 0.85 },
    { edge: 2000, quality: 0.8 },
    { edge: 1600, quality: 0.75 },
];

const shrunkFiles = new WeakMap<File, Promise<File>>();

async function encode(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob> {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    // JPEG has no alpha channel: without this, transparent areas turn black.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('Could not encode image');
    return blob;
}

async function shrink(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
        for (const { edge, quality } of STEPS) {
            const blob = await encode(bitmap, edge, quality);
            if (blob.size <= MAX_UPLOAD_BYTES) {
                // Keep the name: Excel rows refer to images by filename.
                return new File([blob], file.name, { type: 'image/jpeg', lastModified: file.lastModified });
            }
        }
    } finally {
        bitmap.close();
    }
    throw new Error('Image is still too large');
}

/**
 * Returns a file within the upload limit, shrinking it in the browser when needed.
 * Results are remembered so a retried import sends identical bytes and its receipt still matches.
 */
export function shrinkImageIfNeeded(file: File): Promise<File> {
    if (file.size <= MAX_UPLOAD_BYTES || !SHRINKABLE_TYPES.has(file.type)) return Promise.resolve(file);
    const known = shrunkFiles.get(file);
    if (known) return known;
    const pending = shrink(file).catch(() => {
        shrunkFiles.delete(file);
        throw new Error(`Không thu nhỏ được ảnh ${file.name}. Hãy thử ảnh khác.`);
    });
    shrunkFiles.set(file, pending);
    return pending;
}
