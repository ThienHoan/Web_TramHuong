'use client';

import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { setAccessToken, getProfile } from '@/lib/api-client';
import { Link, useRouter } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import TraditionalLocationSelector from '@/components/traditional/checkout/TraditionalLocationSelector';
import GuestCheckoutForm from '@/components/traditional/checkout/GuestCheckoutForm';
import ProductImage from '@/components/ui/ProductImage';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

type CheckoutMode = 'init' | 'guest_form' | 'user_checkout';

export default function TraditionalCheckout() {
    const { items, total, updateQuantity, removeItem, clearCart } = useCart();
    const { user, session, loading: authLoading } = useAuth();
    const { formatPrice } = useCurrency();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [mode, setMode] = useState<CheckoutMode>('init');

    // User Checkout State
    const [shippingInfo, setShippingInfo] = useState({
        name: '',
        phone: '',
        address: '', // Street Address
        city: '' // Province
    });

    const [locationParts, setLocationParts] = useState({
        province: '',
        district: '',
        ward: ''
    });

    const [error, setError] = useState<string | null>(null);
    const isFreeShipping = total >= 300000;
    const shippingFee = isFreeShipping ? 0 : 30000;
    const finalTotal = total + shippingFee;

    // Determine Initial Mode
    useEffect(() => {
        if (!authLoading) {
            if (session) {
                setMode('user_checkout');
                // Load profile
                if (session.access_token) {
                    setAccessToken(session.access_token);
                    getProfile().then(profile => {
                        if (profile) {
                            setShippingInfo(prev => ({
                                ...prev,
                                name: prev.name || profile.full_name || '',
                                phone: prev.phone || profile.phone_number || '',
                                address: prev.address || profile.street_address || '',
                                city: prev.city || profile.province || ''
                            }));
                            if (profile.province) {
                                setLocationParts({
                                    province: profile.province || '',
                                    district: profile.district || '',
                                    ward: profile.ward || ''
                                });
                            }
                        }
                    }).catch(console.error);
                }
            } else {
                setMode(prev => prev === 'user_checkout' ? 'init' : prev);
            }
        }
    }, [session, authLoading]);

    const handleUserCheckout = async () => {
        setError(null);
        if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
            setError('Vui lòng điền đầy đủ thông tin giao hàng.');
            return;
        }
        if (!locationParts.province || !locationParts.district || !locationParts.ward) {
            setError('Vui lòng chọn đầy đủ địa chỉ hành chính.');
            return;
        }

        setLoading(true);
        try {
            const fullShippingInfo = {
                ...shippingInfo,
                city: locationParts.province,
                full_address: `${shippingInfo.address}, ${locationParts.ward}, ${locationParts.district}, ${locationParts.province}`
            };
            localStorage.setItem('checkout_shipping_info', JSON.stringify(fullShippingInfo));
            router.push('/checkout/payment_select');
        } catch (e: any) {
            setError(e.message || 'Có lỗi xảy ra.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestSubmit = (data: any) => {
        setLoading(true);
        try {
            // Save to localStorage
            localStorage.setItem('checkout_shipping_info', JSON.stringify({
                name: data.name,
                phone: data.phone,
                full_address: data.full_address,
                email: '', // Optional for guest
                city: data.province // standardized
            }));
            // Mark as guest order
            localStorage.setItem('is_guest_checkout', 'true');

            router.push('/checkout/payment_select');
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    if (items.length === 0) {
        // ... existing empty cart logic handled in render ...
    }

    return (
        <div className="bg-trad-bg-light font-display text-[#1c0d0d] antialiased min-h-screen flex flex-col selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-8 pb-32 lg:pb-8">
                {/* Breadcrumbs */}
                <nav className="mb-8 flex items-center gap-2 text-sm md:text-base">
                    <span className="text-trad-red-900 font-bold border-b-2 border-trad-primary">Thông tin</span>
                    <span className="material-symbols-outlined text-trad-border-warm text-sm">chevron_right</span>
                    <span className="text-gray-400 font-medium">Thanh toán</span>
                </nav>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg flex items-center gap-3">
                        <span className="material-symbols-outlined">error</span>
                        <p>{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-7 flex flex-col gap-8">

                        {/* 1. GUEST ENTRY SELECTION (If not logged in and in init mode) */}
                        {!session && mode === 'init' && (
                            <section className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                <div className="bg-white rounded-xl border border-trad-border-warm shadow-md p-8 text-center flex flex-col items-center gap-6">
                                    <div className="w-16 h-16 rounded-full bg-trad-bg-warm flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-trad-primary">rocket_launch</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-trad-red-900 mb-2">Thanh toán ngay</h2>
                                        <p className="text-trad-text-muted">Không cần tài khoản. Nhanh chóng và tiện lợi.</p>
                                    </div>
                                    <button
                                        onClick={() => setMode('guest_form')}
                                        className="w-full max-w-md bg-trad-primary hover:bg-trad-primary-dark text-white font-bold py-4 px-8 rounded-lg shadow-lg shadow-orange-900/20 text-lg transition-all transform hover:-translate-y-1"
                                    >
                                        Thanh toán nhanh
                                    </button>
                                </div>

                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-trad-border-warm/50"></div>
                                    <span className="flex-shrink-0 mx-4 text-trad-text-muted text-sm">Hoặc</span>
                                    <div className="flex-grow border-t border-trad-border-warm/50"></div>
                                </div>

                                <div className="bg-trad-bg-warm/30 rounded-xl border border-trad-border-warm/50 p-6 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-trad-text-muted text-2xl">account_circle</span>
                                        <div className="text-left">
                                            <p className="font-bold text-trad-text-main">Đã có tài khoản?</p>
                                            <p className="text-xs text-trad-text-muted">Đăng nhập để tích điểm và lưu địa chỉ</p>
                                        </div>
                                    </div>
                                    <Link href="/login?redirect=/checkout" className="text-trad-primary font-bold hover:underline">
                                        Đăng nhập
                                    </Link>
                                </div>
                            </section>
                        )}

                        {/* 2. FORM SECTIONS */}
                        {(mode === 'guest_form' || mode === 'user_checkout') && (
                            <>
                                {/* Cart Review with PROPER CONTROLS */}
                                <section className="rounded-xl overflow-hidden border-2 border-trad-border-warm shadow-md bg-white">
                                    <div className="px-6 py-4 border-b-2 border-trad-border-warm bg-trad-bg-warm flex justify-between items-center">
                                        <h2 className="font-bold flex items-center gap-2 text-trad-red-900 text-lg">
                                            <span className="material-symbols-outlined text-trad-primary">shopping_bag</span>
                                            Giỏ hàng ({items.length})
                                        </h2>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {items.map(item => (
                                            <div key={item.key} className="flex gap-4 pb-4 border-b-2 border-trad-border-warm/30 last:border-0">
                                                {/* Image */}
                                                <div className="w-20 h-20 rounded-lg border-2 border-trad-border-warm overflow-hidden shrink-0 bg-trad-bg-warm">
                                                    <ProductImage src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 flex flex-col gap-2">
                                                    {/* Title Row */}
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm text-trad-text-main leading-tight">{item.title}</p>
                                                            {item.variantName && <p className="text-xs text-trad-text-muted mt-0.5">{item.variantName}</p>}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeItem(item.key);
                                                            }}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                                            title="Xóa"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                        </button>
                                                    </div>

                                                    {/* Quantity + Price Row */}
                                                    <div className="flex justify-between items-center">
                                                        {/* Quantity Controls */}
                                                        <div className="flex items-center gap-0 border-2 border-trad-border-warm rounded-lg overflow-hidden bg-white">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newQty = item.quantity - 1;
                                                                    if (newQty >= 1) {
                                                                        updateQuantity(item.key, newQty);
                                                                    }
                                                                }}
                                                                disabled={item.quantity <= 1}
                                                                className="px-3 py-2 hover:bg-trad-bg-warm active:bg-trad-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px] text-trad-text-main font-bold">remove</span>
                                                            </button>
                                                            <span className="px-4 py-2 min-w-[3ch] text-center text-sm font-bold text-trad-text-main border-x-2 border-trad-border-warm bg-trad-bg-warm/30">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newQty = item.quantity + 1;
                                                                    updateQuantity(item.key, newQty);
                                                                }}
                                                                className="px-3 py-2 hover:bg-trad-bg-warm active:bg-trad-primary/10 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px] text-trad-text-main font-bold">add</span>
                                                            </button>
                                                        </div>

                                                        {/* Price */}
                                                        <div className="text-right">
                                                            <p className="text-base font-bold text-trad-primary">{formatPrice(item.price * item.quantity)}</p>
                                                            <p className="text-xs text-trad-text-muted">{formatPrice(item.price)}/sp</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {items.length === 0 && (
                                            <div className="text-center py-12 text-trad-text-muted">
                                                <span className="material-symbols-outlined text-5xl mb-3 opacity-30">shopping_cart</span>
                                                <p className="font-medium">Giỏ hàng trống</p>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Delivery Info Form */}
                                <section className="rounded-xl overflow-hidden border border-trad-border-warm shadow-md bg-white text-trad-text-main relative">
                                    <div className="px-6 py-4 border-b border-trad-border-warm bg-trad-bg-warm/50">
                                        <h2 className="text-xl font-bold flex items-center gap-2 text-trad-red-900">
                                            <span className="material-symbols-outlined text-trad-primary">local_shipping</span>
                                            Thông tin giao hàng
                                        </h2>
                                    </div>
                                    <div className="p-6">
                                        {mode === 'guest_form' ? (
                                            <GuestCheckoutForm onSubmit={handleGuestSubmit} />
                                        ) : (
                                            /* User Form (Existing Logic) */
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-sm font-bold text-trad-text-main" htmlFor="name">Họ và tên</label>
                                                    <input
                                                        className="w-full bg-white border border-trad-border-warm rounded-lg px-4 py-2.5 text-trad-text-main focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none"
                                                        value={shippingInfo.name}
                                                        onChange={e => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-sm font-bold text-trad-text-main" htmlFor="phone">Số điện thoại</label>
                                                    <input
                                                        className="w-full bg-white border border-trad-border-warm rounded-lg px-4 py-2.5 text-trad-text-main focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none"
                                                        value={shippingInfo.phone}
                                                        onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2 md:col-span-2">
                                                    <label className="text-sm font-bold text-trad-text-main" htmlFor="address">Địa chỉ cụ thể</label>
                                                    <input
                                                        className="w-full bg-white border border-trad-border-warm rounded-lg px-4 py-2.5 text-trad-text-main focus:border-trad-primary focus:ring-1 focus:ring-trad-primary outline-none"
                                                        value={shippingInfo.address}
                                                        onChange={e => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                                    />
                                                </div>
                                                <TraditionalLocationSelector
                                                    onLocationChange={(loc) => setLocationParts({ province: loc.province, district: loc.district, ward: loc.ward })}
                                                    initialProvince={locationParts.province}
                                                    initialDistrict={locationParts.district}
                                                    initialWard={locationParts.ward}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Summary */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-24 space-y-6">
                            {/* Summary Card */}
                            <div className="rounded-xl overflow-hidden border border-trad-border-warm shadow-xl bg-white text-trad-text-main flex flex-col">
                                <div className="px-6 py-5 border-b border-trad-border-warm bg-trad-bg-warm/50">
                                    <h2 className="text-xl font-bold text-trad-red-900">Tóm tắt đơn hàng</h2>
                                </div>
                                <div className="p-6 flex flex-col gap-4">
                                    {(() => {
                                        // Calculate discount savings
                                        const totalSavings = items.reduce((sum, item) => {
                                            // Use discount_amount if available (for logged-in users)
                                            // For guest users, discount_amount might not exist, so default to 0
                                            return sum + ((item.discount_amount || 0) * item.quantity);
                                        }, 0);

                                        return (
                                            <>
                                                <div className="flex justify-between items-center text-trad-text-muted">
                                                    <span>Tạm tính</span>
                                                    <span className="font-medium text-trad-text-main">{formatPrice(total)}</span>
                                                </div>

                                                {/* Show discount savings if any */}
                                                {totalSavings > 0 && (
                                                    <div className="flex justify-between items-center px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-green-600 text-[20px]">local_offer</span>
                                                            <span className="text-sm font-medium text-green-700">Tiết kiệm</span>
                                                        </div>
                                                        <span className="font-bold text-green-600">-{formatPrice(totalSavings)}</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center text-trad-text-muted">
                                                    <span>Phí vận chuyển</span>
                                                    <span className={`font-medium ${isFreeShipping ? 'text-trad-text-muted' : 'text-trad-text-main'}`}>
                                                        {isFreeShipping ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="line-through text-xs">{formatPrice(30000)}</span>
                                                                <span className="text-green-600 font-bold">-{formatPrice(30000)}</span>
                                                            </div>
                                                        ) : (
                                                            formatPrice(shippingFee)
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="h-px w-full bg-trad-border-warm/50 my-2"></div>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-lg font-bold text-trad-text-main">Tổng cộng</span>
                                                    <span className="text-2xl font-bold text-trad-red-900">{formatPrice(finalTotal)}</span>
                                                </div>
                                            </>
                                        );
                                    })()}

                                    {/* Action Buttons for USER CHECKOUT (Guest handles it in form) */}
                                    {mode === 'user_checkout' && (
                                        <button
                                            onClick={handleUserCheckout}
                                            disabled={loading}
                                            className="mt-4 w-full bg-trad-primary hover:bg-trad-primary-dark text-white font-bold py-3.5 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
                                        >
                                            {loading ? 'Đang xử lý...' : 'Tiếp tục thanh toán'}
                                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Sticky Footer (Only for User Mode - Guest Form has its own button, or global override?) */}
                {/* Guest Form has its own button inline. User Form needs this. */}
                {mode === 'user_checkout' && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-trad-border-warm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:hidden z-40 animate-slide-up">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-xs text-trad-text-muted">Tổng cộng</span>
                                <span className="text-xl font-bold text-trad-red-900">{formatPrice(finalTotal)}</span>
                            </div>
                            <button
                                onClick={handleUserCheckout}
                                disabled={loading}
                                className="bg-trad-primary hover:bg-trad-primary-dark text-white font-bold py-3 px-6 rounded-lg shadow-md flex items-center gap-2 disabled:opacity-50"
                            >
                                {loading ? 'Xử lý...' : 'Thanh toán'}
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
            <TraditionalFooter />
        </div>
    );
}
