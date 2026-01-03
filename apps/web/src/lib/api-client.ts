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
        const error = await res.json();
        throw new Error(error.message || 'Không tìm thấy đơn hàng');
    }

    return await res.json();
}

export const createOrder = orderService.createOrder;
export const getMyOrders = orderService.getMyOrders;
export const getOrder = orderService.getOrder;

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


