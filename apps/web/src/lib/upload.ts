/**
 * Upload utilities for product images
 * Uses backend storage endpoints
 */

import { supabase } from '@/lib/supabase';

interface UploadResult {
    url: string;
    path: string;
}

/**
 * Get auth token from current session
 */
async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Upload a product image to Supabase Storage
 * @param file - Image file to upload
 * @returns Public URL of uploaded image
 */
export async function uploadProductImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    // Get auth token
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Not authenticated. Please login first.');
    }

    try {
        const response = await fetch('/api/storage/upload/product-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }

        const data: { success: boolean; data: UploadResult } = await response.json();

        if (!data.success || !data.data?.url) {
            throw new Error('Invalid response from server');
        }

        return data.data.url;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to upload image');
    }
}

/**
 * Delete a product image from Supabase Storage
 * @param url - Public URL of the image to delete
 */
export async function deleteProductImage(url: string): Promise<void> {
    // Extract path from URL
    // Format: https://....supabase.co/storage/v1/object/public/product-images/products/12345-abc.jpg
    const pathMatch = url.match(/product-images\/(.+)$/);

    if (!pathMatch) {
        throw new Error('Invalid image URL format');
    }

    const path = pathMatch[1];

    // Get auth token
    const token = await getAuthToken();
    if (!token) {
        throw new Error('Not authenticated. Please login first.');
    }

    try {
        const response = await fetch('/api/storage/delete/product-image', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ path }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Delete failed');
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to delete image');
    }
}

/**
 * Validate image file before upload
 * @param file - File to validate
 * @throws Error if validation fails
 */
export function validateImageFile(file: File): void {
    // Check file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error('File size exceeds 5MB limit');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, WebP, and AVIF allowed');
    }
}
