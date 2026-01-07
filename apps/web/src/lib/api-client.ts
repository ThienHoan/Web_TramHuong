import { setAccessToken as setBaseToken, API_URL, getHeaders } from '../services/base-http';
import { productService } from '../services/product-service';
import { orderService } from '../services/order-service';
import { authService } from '../services/auth-service';
import { reviewService } from '../services/review-service';
import { wishlistService } from '../services/wishlist-service';
import { blogService } from '../services/blog-service';
import { contactService } from '../services/contact-service';

// Re-export types if needed, or consumers should import from types/
export * from '../services/base-http';

// Authentication
export const setAccessToken = setBaseToken;

// Products
export const getProducts = productService.getProducts;
export const getProduct = productService.getProduct;
export const getCategories = productService.getCategories;

// Orders
export async function lookupOrder(orderCode: string, emailOrPhone: string): Promise<any> {
    const res = await fetch(`${API_URL}/orders/lookup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ orderCode, emailOrPhone }),
    });

    if (!res.ok) {
        let errorData: any = {};
        try {
            errorData = await res.json();
        } catch (e) {
            // Ignore if JSON parse fails
        }

        throw {
            status: res.status,
            message: errorData.message || 'Không tìm thấy đơn hàng',
            errors: errorData.errors
        };
    }

    return await res.json();
}

export const createOrder = orderService.createOrder;
export const getMyOrders = orderService.getMyOrders;
export const getOrder = orderService.getOrder;
export const getOrderStatus = orderService.getOrderStatus;

// Auth / User
export const getProfile = authService.getProfile;
export const updateProfile = authService.updateProfile;

// Reviews
export const getReviews = reviewService.getReviews;
export const createReview = reviewService.createReview;
export const getMyReviews = reviewService.getMyReviews;
export const updateReview = reviewService.updateReview;
export const deleteReview = reviewService.deleteReview;
export const seedReview = reviewService.seedReview;

// Wishlist
export const toggleWishlist = wishlistService.toggleWishlist;
export const getWishlist = wishlistService.getWishlist;
export const getLikedIds = wishlistService.getLikedIds;

// Blog
export const getPosts = blogService.getPosts;
export const getPostBySlug = blogService.getPostBySlug;
export const createPost = blogService.createPost;
export const updatePost = blogService.updatePost;
export const deletePost = blogService.deletePost;


// Contact
export const submitContact = contactService.submitContact;
export const getContacts = contactService.getContacts;
export const updateContactStatus = contactService.updateContactStatus;

// Vouchers
import { vouchersService } from '../services/vouchers-service';
export const getVouchers = vouchersService.getVouchers;
export const getVoucher = vouchersService.getVoucher;
export const createVoucher = vouchersService.createVoucher;
export const updateVoucher = vouchersService.updateVoucher;
export const deleteVoucher = vouchersService.deleteVoucher;
export const validateVoucher = vouchersService.validateVoucher;



// Chat AI
export async function chatWithAI(message: string, history: any[] = []): Promise<any> {
    const res = await fetch(`${API_URL}/chat/message`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, history }),
    });

    if (!res.ok) {
        let errorData: any = {};
        try {
            errorData = await res.json();
        } catch { }

        throw {
            status: res.status,
            message: errorData.message || 'AI Chat Error',
            errors: errorData.errors
        };
    }

    return await res.json();
}

/**
 * Streaming chat using fetch + ReadableStream
 * @param message User message
 * @param history Chat history
 * @param onChunk Callback for each text chunk
 * @param onWarning Callback for truncation warning
 * @param onError Callback for errors
 * @param signal AbortSignal for cancellation
 */
export async function chatWithAIStream(
    message: string,
    history: any[] = [],
    onChunk: (text: string) => void,
    onWarning?: (message: string) => void,
    onError?: (error: string) => void,
    signal?: AbortSignal
): Promise<void> {
    const res = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, history }),
        signal,
    });

    if (!res.ok) {
        let errorData: any = {};
        try {
            errorData = await res.json();
        } catch { }

        throw {
            status: res.status,
            message: errorData.message || 'AI Stream Error',
            errors: errorData.errors
        };
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'chunk') {
                            onChunk(data.content);
                        } else if (data.type === 'warning' && onWarning) {
                            onWarning(data.content);
                        } else if (data.type === 'error' && onError) {
                            onError(data.content);
                        } else if (data.type === 'done') {
                            // Stream complete
                            return;
                        }
                    } catch {
                        // Ignore parse errors for incomplete JSON
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
