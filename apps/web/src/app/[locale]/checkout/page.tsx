'use client';

import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { setAccessToken, getProfile } from '@/lib/api-client';
import { Link, useRouter } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import TraditionalLocationSelector from '@/components/traditional/checkout/TraditionalLocationSelector';
import ProductImage from '@/components/ui/ProductImage';

import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

export default function TraditionalCheckoutPage() {
    const { items, total, updateQuantity, removeItem, clearCart } = useCart();
    const { user, session } = useAuth();
    const { formatPrice } = useCurrency();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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

    // Load user profile
    useEffect(() => {
        if (session?.access_token) {
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
                            province: profile.province,
                            district: profile.district || '',
                            ward: profile.ward || ''
                        });
                    }
                }
            }).catch(console.error);
        }
    }, [session]);

    const handleCheckout = async () => {
        setError(null);

        if (!user || !session) {
            router.push('/login?redirect=/checkout');
            return;
        }

        if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
            setError('Vui lòng điền đầy đủ thông tin giao hàng.');
            return;
        }

        if (!locationParts.province || !locationParts.district || !locationParts.ward) {
            setError('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã.');
            return;
        }

        setLoading(true);
        try {
            // Check stock or re-validate if needed, but for now just save info and move next

            const fullShippingInfo = {
                ...shippingInfo,
                city: locationParts.province,
                full_address: `${shippingInfo.address}, ${locationParts.ward}, ${locationParts.district}, ${locationParts.province}`
            };

            localStorage.setItem('checkout_shipping_info', JSON.stringify(fullShippingInfo));
            router.push('/checkout/payment_select');

        } catch (e: any) {
            setError(e.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-trad-bg-light font-display text-[#1c0d0d] antialiased min-h-screen flex flex-col selection:bg-trad-primary selection:text-white">
            <TraditionalHeader />

            <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Breadcrumbs */}
                <nav className="mb-8 flex items-center gap-2 text-sm md:text-base">
                    {/* <Link className="text-trad-red-800 hover:text-trad-primary transition-colors font-medium" href="/cart">Giỏ hàng</Link>
                    <span className="material-symbols-outlined text-trad-border-warm text-sm">chevron_right</span> */}
                    <span className="text-trad-red-900 font-bold border-b-2 border-trad-primary">Giỏ hàng và giao hàng</span>
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
                    {/* LEFT COLUMN: Cart & Shipping Form */}
                    <div className="lg:col-span-7 flex flex-col gap-8">
                        {/* Cart Section */}
                        <section className="rounded-xl overflow-hidden border border-trad-border-warm shadow-md bg-white text-trad-text-main">
                            <div className="px-6 py-4 border-b border-trad-border-warm bg-trad-bg-warm/50 flex justify-between items-center">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-trad-red-900">
                                    <span className="material-symbols-outlined text-trad-primary">shopping_bag</span>
                                    Giỏ hàng của bạn
                                </h2>
                                <span className="text-sm text-trad-text-muted">{items.length} sản phẩm</span>
                            </div>
                            <div className="p-6 flex flex-col gap-6">
                                {items.length === 0 ? (
                                    <p className="text-center text-trad-text-muted py-4">Giỏ hàng trống.</p>
                                ) : (
                                    items.map(item => (
                                        <div key={item.key} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-6 border-b border-trad-border-warm/50 last:border-0 last:pb-0">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-trad-border-warm bg-trad-bg-warm">
                                                    <ProductImage src={item.image} alt={item.title} />
                                                </div>
                                                <div className="flex flex-col justify-between h-full">
                                                    <div>
                                                        <h3 className="font-bold text-lg leading-tight text-trad-text-main">{item.title}</h3>
                                                        {item.variantName && <p className="text-sm text-trad-text-muted mt-0.5">{item.variantName}</p>}
                                                    </div>
                                                    <button onClick={() => removeItem(item.key)} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 mt-1 w-fit transition-colors">
                                                        <span className="material-symbols-outlined text-base">delete</span> Xóa
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-2">
                                                <span className="font-bold text-lg text-trad-primary">{formatPrice(item.price * item.quantity)}</span>
                                                <div className="flex items-center rounded-lg bg-trad-bg-warm border border-trad-border-warm p-1">
                                                    <button onClick={() => updateQuantity(item.key, -1)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-white text-trad-text-main transition-colors">
                                                        <span className="material-symbols-outlined text-sm">remove</span>
                                                    </button>
                                                    <input readOnly className="w-10 bg-transparent text-center text-sm font-medium text-trad-text-main border-none focus:ring-0 p-0" type="number" value={item.quantity} />
                                                    <button onClick={() => updateQuantity(item.key, 1)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-white text-trad-text-main transition-colors">
                                                        <span className="material-symbols-outlined text-sm">add</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Shipping Form Section */}
                        <section className="rounded-xl overflow-hidden border border-trad-border-warm shadow-md bg-white text-trad-text-main relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-trad-red-900">
                                <svg fill="currentColor" height="100" viewBox="0 0 24 24" width="100">
                                    <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z"></path>
                                </svg>
                            </div>
                            <div className="px-6 py-4 border-b border-trad-border-warm bg-trad-bg-warm/50">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-trad-red-900">
                                    <span className="material-symbols-outlined text-trad-primary">local_shipping</span>
                                    Thông tin giao hàng
                                </h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-trad-text-main" htmlFor="name">Họ và tên</label>
                                    <input
                                        className="w-full bg-white border border-trad-border-warm rounded-lg px-4 py-2.5 text-trad-text-main placeholder-trad-text-muted focus:border-trad-primary focus:ring-1 focus:ring-trad-primary transition-all outline-none"
                                        id="name"
                                        placeholder="Nguyễn Văn A"
                                        type="text"
                                        value={shippingInfo.name}
                                        onChange={e => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-trad-text-main" htmlFor="phone">Số điện thoại</label>
                                    <input
                                        className="w-full bg-white border border-trad-border-warm rounded-lg px-4 py-2.5 text-trad-text-main placeholder-trad-text-muted focus:border-trad-primary focus:ring-1 focus:ring-trad-primary transition-all outline-none"
                                        id="phone"
                                        placeholder="09xx xxx xxx"
                                        type="tel"
                                        value={shippingInfo.phone}
                                        onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label className="text-sm font-bold text-trad-text-main" htmlFor="address">Địa chỉ cụ thể</label>
                                    <input
                                        className="w-full bg-white border border-trad-border-warm rounded-lg px-4 py-2.5 text-trad-text-main placeholder-trad-text-muted focus:border-trad-primary focus:ring-1 focus:ring-trad-primary transition-all outline-none"
                                        id="address"
                                        placeholder="Số nhà, tên đường..."
                                        type="text"
                                        value={shippingInfo.address}
                                        onChange={e => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                    />
                                </div>

                                {/* Location Selector */}
                                <TraditionalLocationSelector
                                    onLocationChange={(loc) => setLocationParts({
                                        province: loc.province,
                                        district: loc.district,
                                        ward: loc.ward
                                    })}
                                    initialProvince={locationParts.province}
                                    initialDistrict={locationParts.district}
                                    initialWard={locationParts.ward}
                                />

                                <div className="md:col-span-2 pt-2">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-trad-border-warm bg-white checked:bg-trad-primary checked:border-trad-primary transition-all" type="checkbox" />
                                            <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 text-sm pointer-events-none">check</span>
                                        </div>
                                        <span className="text-sm text-trad-text-muted group-hover:text-trad-primary transition-colors">Lưu thông tin cho lần mua hàng sau</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Payment Method Section Removed - Moved to Next Step */}
                    </div>

                    {/* RIGHT COLUMN: Sticky Summary */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-24 space-y-6">
                            {/* Order Summary Card */}
                            <div className="rounded-xl overflow-hidden border border-trad-border-warm shadow-xl bg-white text-trad-text-main flex flex-col">
                                <div className="px-6 py-5 border-b border-trad-border-warm bg-trad-bg-warm/50">
                                    <h2 className="text-xl font-bold text-trad-red-900">Tóm tắt đơn hàng</h2>
                                </div>
                                <div className="p-6 flex flex-col gap-4">
                                    <div className="flex justify-between items-center text-trad-text-muted">
                                        <span>Tạm tính</span>
                                        <span className="font-medium text-trad-text-main">{formatPrice(total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-trad-text-muted">
                                        <span>Phí vận chuyển</span>
                                        <span className="font-medium text-trad-text-main">{formatPrice(shippingFee)}</span>
                                    </div>
                                    {/* Divider */}
                                    <div className="h-px w-full bg-trad-border-warm/50 my-2"></div>
                                    {/* Total */}
                                    <div className="flex justify-between items-end">
                                        <span className="text-lg font-bold text-trad-text-main">Tổng cộng</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-2xl font-bold text-trad-red-900">{formatPrice(finalTotal)}</span>
                                            <span className="text-xs text-trad-text-muted">(Đã bao gồm VAT)</span>
                                        </div>
                                    </div>

                                    {!user && (
                                        <div className="mt-2 text-center text-trad-primary text-sm font-medium animate-pulse">
                                            Vui lòng đăng nhập để thanh toán
                                        </div>
                                    )}

                                    {/* Main CTA */}
                                    <button
                                        onClick={handleCheckout}
                                        disabled={loading || !user}
                                        className="mt-4 w-full bg-trad-primary hover:bg-trad-primary-dark text-white font-bold py-3.5 px-6 rounded-lg shadow-lg shadow-orange-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Đang xử lý...' : 'Tiếp tục thanh toán'}
                                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </button>

                                    <Link className="text-center text-sm text-trad-text-muted hover:text-trad-primary transition-colors underline decoration-trad-border-warm hover:decoration-trad-primary" href="/products">
                                        Quay lại cửa hàng
                                    </Link>
                                </div>
                            </div>

                            {/* Trust/Support Box */}
                            <div className="bg-white border border-trad-border-warm/20 rounded-xl p-6 shadow-sm">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="rounded-full bg-trad-bg-warm p-2 text-trad-primary">
                                        <span className="material-symbols-outlined">support_agent</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-trad-red-900">Hỗ trợ khách hàng</h4>
                                        <p className="text-sm text-gray-600 mt-1">Bạn cần giúp đỡ? Hãy liên hệ với chúng tôi qua hotline.</p>
                                    </div>
                                </div>
                                <a className="flex items-center justify-center gap-2 w-full py-2 border border-trad-border-warm/30 rounded-lg text-trad-red-900 font-bold hover:bg-trad-bg-warm transition-colors" href="tel:0356176878">
                                    <span className="material-symbols-outlined text-lg">call</span>
                                    035.617.68.78
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <TraditionalFooter />
        </div>
    );
}