import { setAccessToken as setBaseToken } from '../services/base-http';
import { productService } from '../services/product-service';
import { orderService } from '../services/order-service';
import { authService } from '../services/auth-service';
import { reviewService } from '../services/review-service';
import { wishlistService } from '../services/wishlist-service';
import { blogService } from '../services/blog-service';

// Re-export types if needed, or consumers should import from types/
export * from '../services/base-http';

// Authentication
export const setAccessToken = setBaseToken;

// Products
export const getProducts = productService.getProducts;
export const getProduct = productService.getProduct;
export const getCategories = productService.getCategories;

// Orders
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

