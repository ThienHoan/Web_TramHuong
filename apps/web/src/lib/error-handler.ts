import { toast } from 'sonner';

/**
 * Standardized API Error Response
 */
export interface ApiResult<T> {
    data: T | null;
    error: string | null;
    status?: number;
    errors?: string[]; // Add errors support for form fields if needed later
}

/**
 * Vietnamese error message mappings
 */
const ERROR_MESSAGES: Record<string, string> = {
    // Network errors
    'Failed to fetch': 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.',
    'Network request failed': 'Lỗi mạng. Vui lòng thử lại sau.',
    'NetworkError': 'Kết nối mạng bị gián đoạn.',

    // Auth errors
    'Unauthorized': 'Bạn cần đăng nhập để thực hiện thao tác này.',
    'Invalid credentials': 'Email hoặc mật khẩu không đúng.',
    'Token expired': 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
    'Access denied': 'Bạn không có quyền truy cập.',
    'Forbidden': 'Bạn không có quyền thực hiện thao tác này.',

    // Validation errors
    'Bad Request': 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    'Validation failed': 'Thông tin nhập không hợp lệ.',

    // Server errors
    'Internal Server Error': 'Lỗi máy chủ. Vui lòng thử lại sau.',
    'Service Unavailable': 'Hệ thống đang bảo trì. Vui lòng quay lại sau.',

    // Business logic errors
    'Not found': 'Không tìm thấy dữ liệu yêu cầu.',
    'Order not found': 'Không tìm thấy đơn hàng.',
    'Product not found': 'Sản phẩm không tồn tại.',
    'Out of stock': 'Sản phẩm tạm hết hàng.',
    'Insufficient stock': 'Không đủ số lượng trong kho.',
    'Voucher expired': 'Mã giảm giá đã hết hạn.',
    'Voucher invalid': 'Mã giảm giá không hợp lệ.',
    'Payment failed': 'Thanh toán thất bại. Vui lòng thử lại.',

    // Rate limiting
    'Too Many Requests': 'Bạn đang thao tác quá nhanh. Vui lòng chờ một chút.',
    'ThrottlerException': 'Vui lòng chờ trước khi thử lại.',
};

/**
 * Parse error and return Vietnamese-friendly message
 */
export function parseApiError(error: unknown): string {
    if (!error) return 'Đã có lỗi xảy ra.';

    // Check for structured error object with status
    interface ErrorWithStatus {
        status?: number;
        statusCode?: number;
        message?: string;
        error?: string;
        errors?: string[];
    }
    const err = error as ErrorWithStatus;
    const status = err?.status || err?.statusCode;

    if (status) {
        switch (status) {
            case 400:
                // Prioritize validation errors array
                if (Array.isArray(err.errors) && err.errors.length > 0) {
                    return err.errors[0];
                }
                return err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
            case 401:
                return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
            case 403:
                return 'Bạn không có quyền thực hiện thao tác này.';
            case 404:
                return 'Không tìm thấy dữ liệu yêu cầu.';
            case 409:
                return err.message || 'Dữ liệu bị trùng lặp.';
            case 429:
                return 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.';
            case 500:
            case 502:
            case 503:
                return 'Lỗi hệ thống. Vui lòng thử lại sau.';
            default:
                // Fallback to message if available
                if (err.message) return err.message;
        }
    }

    // Handle Error objects
    if (error instanceof Error) {
        const message = error.message;

        // Check direct match
        if (ERROR_MESSAGES[message]) {
            return ERROR_MESSAGES[message];
        }

        // Check partial match
        for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
            if (message.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        // Return original if no match found
        return message;
    }

    // Handle string error
    if (typeof error === 'string') {
        if (ERROR_MESSAGES[error]) {
            return ERROR_MESSAGES[error];
        }
        return error;
    }

    // Fallback for object with message prop but no status
    if (typeof error === 'object' && error !== null) {
        if (err.message) {
            return parseApiError(err.message);
        }
        if (err.error) {
            return parseApiError(err.error);
        }
    }

    return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
}

/**
 * Handle API error with toast notification
 * @param error - The error object
 * @param context - Context for the error (e.g., "thêm vào giỏ hàng")
 * @param showToast - Whether to show toast notification (default: true)
 */
export function handleApiError(
    error: unknown,
    context?: string,
    showToast = true
): string {
    const message = parseApiError(error);

    // Log for debugging
    console.error(`[API Error]${context ? ` ${context}:` : ''}`, error);

    // Show toast if enabled
    if (showToast) {
        toast.error(context ? `Lỗi ${context}` : 'Đã có lỗi', {
            description: message,
        });
    }

    return message;
}

/**
 * Wrap async function with standardized error handling
 * Returns { data, error, status } instead of throwing
 */
export async function safeAsync<T>(
    asyncFn: () => Promise<T>,
    fallback?: T
): Promise<ApiResult<T>> {
    try {
        const data = await asyncFn();
        return { data, error: null };
    } catch (e: unknown) {
        const error = parseApiError(e);
        console.error('[safeAsync]', e);
        const errorWithStatus = e as { status?: number; response?: { status?: number } };
        return {
            data: fallback ?? null,
            error,
            status: errorWithStatus?.status || errorWithStatus?.response?.status
        };
    }
}

/**
 * Create a typed API result helper
 */
export function apiResult<T>(data: T): ApiResult<T> {
    return { data, error: null };
}

export function apiError<T>(error: string, status?: number): ApiResult<T> {
    return { data: null, error, status };
}
