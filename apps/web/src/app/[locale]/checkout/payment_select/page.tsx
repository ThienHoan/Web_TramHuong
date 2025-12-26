'use client';

import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { createOrder, setAccessToken } from '@/lib/api-client';
import { Link, useRouter } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import ProductImage from '@/components/ui/ProductImage';

export default function PaymentSelectPage() {
    const { items, total, clearCart } = useCart();
    const { user, session } = useAuth();
    const { formatPrice } = useCurrency();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [shippingInfo, setShippingInfo] = useState<any>(null);

    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'sepay'>('cod');
    const [error, setError] = useState<string | null>(null);
    const shippingFee = 30000;
    const finalTotal = total + shippingFee;

    // Load shipping info from localStorage
    useEffect(() => {
        const storedInfo = localStorage.getItem('checkout_shipping_info');
        if (storedInfo) {
            setShippingInfo(JSON.parse(storedInfo));
        } else {
            router.push('/checkout');
        }
    }, [router]);

    const handlePlaceOrder = async () => {
        setError(null);
        if (!user || !session) {
            router.push('/login?redirect=/checkout/payment_select');
            return;
        }
        if (!shippingInfo) {
            router.push('/checkout');
            return;
        }

        setLoading(true);
        try {
            setAccessToken(session.access_token);
            const orderItems = items.map(i => ({ productId: i.id, quantity: i.quantity }));

            // Reconstruct fullShippingInfo if needed, but assuming data from checkout is already formatted or close to it.
            // shippingInfo from checkout/page.tsx: { name, phone, address, locationParts: { province, district, ward } }
            // API expects: { name, phone, address, city } where address is full string

            const fullShippingInfo = {
                name: shippingInfo.name,
                phone: shippingInfo.phone,
                city: shippingInfo.city, // The province name
                address: shippingInfo.full_address // We will ensure this is saved correctly in previous page
            };

            const order = await createOrder(orderItems, fullShippingInfo, paymentMethod);

            clearCart();
            // Clear storage
            localStorage.removeItem('checkout_shipping_info');

            if (paymentMethod === 'cod') {
                router.push(`/checkout/success?id=${order.id}`);
            } else {
                router.push(`/checkout/payment?id=${order.id}`);
            }
        } catch (e: any) {
            setError(e.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-trad-bg-light font-display text-[#1c0d0d] antialiased min-h-screen flex flex-col selection:bg-trad-primary selection:text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-trad-border-warm bg-trad-bg-light/95 backdrop-blur-sm px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="h-8 w-8 flex items-center justify-center bg-trad-primary/10 rounded-full text-trad-primary">
                            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" /></svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-trad-red-900">Trầm Hương Việt</h1>
                    </Link>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium text-trad-primary">
                    <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">lock</span>
                        Thanh toán an toàn
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Breadcrumbs */}
                <nav className="mb-8 flex items-center gap-2 text-sm md:text-base">
                    <Link className="text-trad-red-800 hover:text-trad-primary transition-colors font-medium" href="/cart">Giỏ hàng</Link>
                    <span className="material-symbols-outlined text-trad-border-warm text-sm">chevron_right</span>
                    <Link className="text-trad-red-800 hover:text-trad-primary transition-colors font-medium" href="/checkout">Vận chuyển</Link>
                    <span className="material-symbols-outlined text-trad-border-warm text-sm">chevron_right</span>
                    <span className="text-trad-red-900 font-bold border-b-2 border-trad-primary">Thanh toán</span>
                </nav>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-3">
                        <span className="material-symbols-outlined">error</span>
                        <p>{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    {/* Left Column: Payment Selection */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Page Heading */}
                        <div className="flex flex-col gap-2">
                            <h1 className="text-trad-red-900 text-3xl md:text-4xl font-bold font-display tracking-tight">Thanh toán</h1>
                            <p className="text-trad-amber-200/80 text-base font-sans">Vui lòng chọn phương thức thanh toán an toàn và tiện lợi.</p>
                        </div>
                        {/* Payment Methods */}
                        <div className="flex flex-col gap-4 mt-2">
                            {/* Option 1: COD */}
                            <label className={`group relative flex items-start md:items-center gap-4 rounded-xl border p-5 cursor-pointer transition-all shadow-sm ${paymentMethod === 'cod' ? 'border-trad-primary bg-white' : 'border-trad-border-warm bg-white hover:border-trad-primary/50'}`}>
                                <div className="flex items-center h-full pt-1 md:pt-0">
                                    <input
                                        className="h-5 w-5 border-2 border-trad-border-warm text-trad-primary focus:ring-trad-primary focus:ring-offset-0 bg-transparent"
                                        name="payment_method"
                                        type="radio"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={() => setPaymentMethod('cod')}
                                    />
                                </div>
                                <div className="flex flex-1 flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-trad-bg-warm text-trad-red-900">
                                        <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                                    </div>
                                    <div className="flex grow flex-col">
                                        <p className="text-trad-red-900 text-base font-bold font-display">Thanh toán khi nhận hàng (COD)</p>
                                        <p className="text-gray-600 text-sm font-sans mt-1">Thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng.</p>
                                    </div>
                                </div>
                            </label>

                            {/* Option 2: Bank Transfer (Recommended) */}
                            <label className={`group relative flex items-start md:items-center gap-4 rounded-xl border-2 p-5 cursor-pointer transition-all shadow-md ${paymentMethod === 'sepay' ? 'border-trad-primary bg-trad-bg-warm/30' : 'border-trad-primary/30 bg-white hover:border-trad-primary'}`}>
                                <div className="absolute -top-3 -right-3 md:top-4 md:right-4 md:left-auto md:translate-x-0">
                                    <span className="inline-flex items-center rounded-full bg-trad-primary/20 px-2.5 py-0.5 text-xs font-bold text-trad-red-900 border border-trad-primary/30">
                                        Khuyên dùng
                                    </span>
                                </div>
                                <div className="flex items-center h-full pt-1 md:pt-0">
                                    <input
                                        className="h-5 w-5 border-2 border-trad-primary text-trad-primary focus:ring-trad-primary focus:ring-offset-0 bg-transparent"
                                        name="payment_method"
                                        type="radio"
                                        value="sepay"
                                        checked={paymentMethod === 'sepay'}
                                        onChange={() => setPaymentMethod('sepay')}
                                    />
                                </div>
                                <div className="flex flex-1 flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                                        <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
                                    </div>
                                    <div className="flex grow flex-col pr-0 md:pr-20">
                                        <p className="text-trad-red-900 text-base font-bold font-display">Chuyển khoản ngân hàng (SePay)</p>
                                        <p className="text-gray-600 text-sm font-sans mt-1">Quét mã VietQR để xác nhận đơn hàng tức thì và tự động.</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                        {/* Back Link */}
                        <div className="mt-4">
                            <Link className="inline-flex items-center gap-2 text-sm font-medium text-trad-amber-200 hover:text-trad-red-900 transition-colors" href="/checkout">
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                Quay lại phần vận chuyển
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div className="lg:col-span-5 w-full">
                        <div className="sticky top-24 flex flex-col bg-white border border-trad-border-warm rounded-xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-trad-border-warm bg-trad-bg-warm/30">
                                <h3 className="text-trad-red-900 text-xl font-bold font-display">Đơn hàng của bạn ({items.length})</h3>
                            </div>
                            {/* Product List */}
                            <div className="flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar p-6 gap-6">
                                {items.map(item => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="relative size-16 shrink-0 rounded-lg overflow-hidden border border-trad-border-warm">
                                            <ProductImage src={item.image} alt={item.title} />
                                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-trad-primary text-[10px] font-bold text-white shadow-sm">{item.quantity}</span>
                                        </div>
                                        <div className="flex flex-col flex-1 gap-1">
                                            <p className="text-trad-red-900 text-sm font-bold font-display line-clamp-2">{item.title}</p>
                                            <p className="text-gray-500 text-xs">SL: {item.quantity}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <p className="text-trad-red-900 text-sm font-bold">{formatPrice(item.price * item.quantity)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Summary Costs */}
                            <div className="p-6 bg-trad-bg-light border-t border-trad-border-warm flex flex-col gap-3">
                                <div className="flex justify-between items-center text-sm">
                                    <p className="text-gray-600">Tạm tính</p>
                                    <p className="text-trad-red-900 font-medium">{formatPrice(total)}</p>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <p className="text-gray-600">Phí vận chuyển</p>
                                    <p className="text-trad-red-900 font-medium">{formatPrice(shippingFee)}</p>
                                </div>
                                <div className="h-px bg-trad-border-warm my-2"></div>
                                <div className="flex justify-between items-center">
                                    <p className="text-trad-red-900 font-bold font-display text-lg">Tổng cộng</p>
                                    <div className="flex flex-col items-end">
                                        <p className="text-trad-primary font-bold font-display text-xl">{formatPrice(finalTotal)}</p>
                                        <p className="text-xs text-gray-500">(Đã bao gồm VAT)</p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    {shippingInfo && (
                                        <div className="text-sm bg-gray-50 p-3 rounded border border-gray-100 mb-2">
                                            <p className="font-bold text-gray-700">Giao tới:</p>
                                            <p className="text-gray-600">{shippingInfo.name} - {shippingInfo.phone}</p>
                                            <p className="text-gray-500 text-xs truncate">{shippingInfo.full_address}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="mt-2">
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 bg-trad-primary hover:bg-yellow-500 text-[#1c180d] font-bold py-3.5 px-6 rounded-lg transition-colors shadow-sm active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
                                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                    </button>
                                </div>
                                {/* Trust Signals */}
                                <div className="mt-4 flex justify-center items-center gap-4 text-xs text-gray-400 grayscale opacity-70">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">verified_user</span>
                                        <span>Bảo mật 100%</span>
                                    </div>
                                    <div className="w-px h-3 bg-trad-border-warm"></div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                                        <span>Đổi trả 7 ngày</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            {/* Simple Footer */}
            <footer className="mt-auto py-8 border-t border-trad-border-warm bg-white">
                <div className="max-w-[960px] mx-auto text-center px-4">
                    <p className="text-gray-500 text-sm">© 2024 Trầm Hương Việt. Tinh hoa trầm hương Việt Nam.</p>
                </div>
            </footer>
        </div>
    );
}