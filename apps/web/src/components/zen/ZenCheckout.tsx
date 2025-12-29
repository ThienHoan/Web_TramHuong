'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/components/providers/CartProvider';
import { useCurrency } from '@/hooks/useCurrency';
import ProductImage from '@/components/ui/ProductImage';
import { Link, useRouter } from '@/i18n/routing';
import ZenFooter from '@/components/zen/ZenFooter';
import { createOrder } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';

// Local state for shipping info
interface ShippingInfo {
    fullName: string;
    phone: string;
    address: string;
    province: string;
    district: string;
    ward: string;
}

interface Division {
    code: number;
    name: string;
}

export default function ZenCheckout() {
    const { items, updateQuantity, removeItem, total, clearCart } = useCart();
    const { formatPrice } = useCurrency();
    const { user } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
        fullName: '',
        phone: '',
        address: '',
        province: '',
        district: '',
        ward: ''
    });

    // Location State
    const [provinces, setProvinces] = useState<Division[]>([]);
    const [districts, setDistricts] = useState<Division[]>([]);
    const [wards, setWards] = useState<Division[]>([]);

    const [selectedProvince, setSelectedProvince] = useState<Division | null>(null);
    const [selectedDistrict, setSelectedDistrict] = useState<Division | null>(null);
    const [selectedWard, setSelectedWard] = useState<Division | null>(null);

    const [loadingP, setLoadingP] = useState(false);
    const [loadingD, setLoadingD] = useState(false);
    const [loadingW, setLoadingW] = useState(false);

    // Fetch Provinces on Mount
    useEffect(() => {
        setLoadingP(true);
        fetch('https://provinces.open-api.vn/api/?depth=1')
            .then(res => res.json())
            .then(data => {
                setProvinces(data);
                setLoadingP(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingP(false);
            });
    }, []);

    // Fetch Districts
    useEffect(() => {
        if (selectedProvince) {
            setLoadingD(true);
            fetch(`https://provinces.open-api.vn/api/p/${selectedProvince.code}?depth=2`)
                .then(res => res.json())
                .then(data => {
                    setDistricts(data.districts);
                    setLoadingD(false);
                });
        } else {
            setDistricts([]);
        }
    }, [selectedProvince]);

    // Fetch Wards
    useEffect(() => {
        if (selectedDistrict) {
            setLoadingW(true);
            fetch(`https://provinces.open-api.vn/api/d/${selectedDistrict.code}?depth=2`)
                .then(res => res.json())
                .then(data => {
                    setWards(data.wards);
                    setLoadingW(false);
                });
        } else {
            setWards([]);
        }
    }, [selectedDistrict]);


    // Calculations
    const estimatedTax = total * 0.1;
    const isFreeShipping = total > 1000000;
    const shippingFee = isFreeShipping ? 0 : 35000;
    const finalTotal = total + estimatedTax + shippingFee;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setShippingInfo(prev => ({ ...prev, [id]: value }));
    };

    const handleLocationChange = (type: 'province' | 'district' | 'ward', code: number) => {
        if (type === 'province') {
            const p = provinces.find(i => i.code === code) || null;
            setSelectedProvince(p);
            setSelectedDistrict(null);
            setSelectedWard(null);
            setWards([]);
            setShippingInfo(prev => ({ ...prev, province: p?.name || '', district: '', ward: '' }));
        } else if (type === 'district') {
            const d = districts.find(i => i.code === code) || null;
            setSelectedDistrict(d);
            setSelectedWard(null);
            setShippingInfo(prev => ({ ...prev, district: d?.name || '', ward: '' }));
        } else if (type === 'ward') {
            const w = wards.find(i => i.code === code) || null;
            setSelectedWard(w);
            setShippingInfo(prev => ({ ...prev, ward: w?.name || '' }));
        }
    };

    const handleContinueToPayment = () => {
        // Basic Validation
        if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address || !shippingInfo.province || !shippingInfo.district || !shippingInfo.ward) {
            alert('Please fill in all shipping details.');
            return;
        }
        setStep('payment');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCompleteOrder = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const payload = {
                items: items.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    variantId: item.variantId || undefined,
                    variantName: item.variantName || undefined
                })),
                shipping_info: {
                    name: shippingInfo.fullName,
                    phone: shippingInfo.phone,
                    address: shippingInfo.address,
                    city: shippingInfo.province,
                    district: shippingInfo.district,
                    ward: shippingInfo.ward,
                    shipping_fee: shippingFee,
                    email: user?.email // Optional
                },
                paymentMethod: paymentMethod
            };

            const order = await createOrder(payload);

            clearCart();

            if (paymentMethod === 'bank_transfer' && order.payment_url) {
                // Redirect to VietQR or Payment Gateway
                window.location.href = order.payment_url;
            } else {
                // Success - Redirect to Profile/Orders or Thank You
                // alert('Order placed successfully!'); // Removed alert for smoother flow
                router.push(`/order-confirmation/${order.id}`);
            }

        } catch (error: any) {
            console.error('Order creation failed:', error);
            alert(error.message || 'Failed to place order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-zen-green-50 dark:bg-[#182111] text-zen-green-text dark:text-white min-h-screen flex flex-col font-manrope transition-colors duration-300">

            <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
                <div className="pt-26 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
                    {/* LEFT COLUMN: Content Switches based on Step */}
                    <div className="lg:col-span-7 flex flex-col gap-10 fade-in-section">
                        {/* Progress Indicator */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between text-[10px] sm:text-xs font-medium tracking-[0.2em] text-zen-green-text/60 dark:text-white/60">
                                <Link href="/cart" className="hover:text-zen-green-primary transition-colors">CART</Link>
                                <span className={`${step === 'shipping' ? 'text-zen-green-primary font-bold' : ''}`}>SHIPPING</span>
                                <span className={`${step === 'payment' ? 'text-zen-green-primary font-bold' : ''}`}>PAYMENT</span>
                            </div>
                            <div className="w-full h-[2px] bg-zen-green-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-zen-green-primary transition-all duration-1000 ease-out`}
                                    style={{ width: step === 'shipping' ? '50%' : '100%' }} // Simple progress visual
                                ></div>
                            </div>
                        </div>

                        {step === 'shipping' ? (
                            <>
                                {/* Headline */}
                                <div>
                                    <h1 className="text-3xl md:text-3xl font-thin tracking-[0.1em] text-zen-green-900 dark:text-white uppercase mb-2">Shipping Details</h1>
                                    <h2 className="text-base font-light tracking-widest text-zen-green-900 dark:text-white uppercase mb-4 mt-8 pb-4 border-b border-zen-green-100 dark:border-white/10">Your Selection ({items.length} ITEMS)</h2>
                                    {/* Mini Cart in Shipping Step */}
                                    <div className="space-y-6 mb-12">
                                        {items.length > 0 ? items.map((item) => (
                                            <div key={item.key} className="group flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-colors border border-transparent hover:border-zen-green-100 dark:hover:border-white/10">
                                                <div className="relative shrink-0 overflow-hidden rounded-lg w-16 h-16 bg-zen-green-100 dark:bg-white/5">
                                                    <ProductImage src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 w-full text-center sm:text-left">
                                                    <h3 className="text-sm font-medium text-zen-green-900 dark:text-white tracking-wide uppercase">{item.title}</h3>
                                                    <p className="text-xs text-zen-green-text/60 font-light">{item.variantName}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center border border-zen-green-200 dark:border-white/20 rounded-md px-2 py-1">
                                                        <button onClick={() => updateQuantity(item.key, -1)} className="text-zen-green-text/60 hover:text-zen-green-primary transition-colors flex items-center p-1">
                                                            <span className="material-symbols-outlined text-[16px]">remove</span>
                                                        </button>
                                                        <span className="mx-3 text-sm font-medium text-zen-green-900 dark:text-white w-4 text-center">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.key, 1)} className="text-zen-green-text/60 hover:text-zen-green-primary transition-colors flex items-center p-1">
                                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeItem(item.key)} className="text-xs text-zen-green-text/60 underline decoration-transparent hover:decoration-zen-green-text/60 transition-all offset-2">Remove</button>
                                                </div>
                                            </div>
                                        )) : (
                                            <p className="text-sm italic text-zen-green-text/60">Cart is empty.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Shipping Form */}
                                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleContinueToPayment(); }}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold tracking-widest text-zen-green-text/60 uppercase" htmlFor="fullName">Full Name</label>
                                            <input required className="w-full bg-transparent border border-zen-green-200 dark:border-white/20 rounded-md px-4 py-3 text-sm text-zen-green-900 dark:text-white focus:outline-none focus:border-zen-green-primary transition-all" id="fullName" value={shippingInfo.fullName} onChange={handleInputChange} placeholder="Enter your full name" type="text" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold tracking-widest text-zen-green-text/60 uppercase" htmlFor="phone">Phone Number</label>
                                            <input required className="w-full bg-transparent border border-zen-green-200 dark:border-white/20 rounded-md px-4 py-3 text-sm text-zen-green-900 dark:text-white focus:outline-none focus:border-zen-green-primary transition-all" id="phone" value={shippingInfo.phone} onChange={handleInputChange} placeholder="+84 ..." type="tel" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold tracking-widest text-zen-green-text/60 uppercase" htmlFor="address">Street Address</label>
                                        <input required className="w-full bg-transparent border border-zen-green-200 dark:border-white/20 rounded-md px-4 py-3 text-sm text-zen-green-900 dark:text-white focus:outline-none focus:border-zen-green-primary transition-all" id="address" value={shippingInfo.address} onChange={handleInputChange} placeholder="House number, Street name" type="text" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold tracking-widest text-zen-green-text/60 uppercase" htmlFor="province">Province</label>
                                            <select required className="w-full bg-transparent border border-zen-green-200 dark:border-white/20 rounded-md px-4 py-3 text-sm text-zen-green-900 dark:text-white focus:outline-none focus:border-zen-green-primary" value={selectedProvince?.code || ''} onChange={(e) => handleLocationChange('province', Number(e.target.value))} disabled={loadingP}>
                                                <option value="" className="text-gray-500">Select...</option>
                                                {provinces.map(p => <option key={p.code} value={p.code} className="text-black">{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold tracking-widest text-zen-green-text/60 uppercase" htmlFor="district">District</label>
                                            <select required className="w-full bg-transparent border border-zen-green-200 dark:border-white/20 rounded-md px-4 py-3 text-sm text-zen-green-900 dark:text-white focus:outline-none focus:border-zen-green-primary" value={selectedDistrict?.code || ''} onChange={(e) => handleLocationChange('district', Number(e.target.value))} disabled={!selectedProvince}>
                                                <option value="" className="text-gray-500">Select...</option>
                                                {districts.map(d => <option key={d.code} value={d.code} className="text-black">{d.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold tracking-widest text-zen-green-text/60 uppercase" htmlFor="ward">Ward</label>
                                            <select required className="w-full bg-transparent border border-zen-green-200 dark:border-white/20 rounded-md px-4 py-3 text-sm text-zen-green-900 dark:text-white focus:outline-none focus:border-zen-green-primary" value={selectedWard?.code || ''} onChange={(e) => handleLocationChange('ward', Number(e.target.value))} disabled={!selectedDistrict}>
                                                <option value="" className="text-gray-500">Select...</option>
                                                {wards.map(w => <option key={w.code} value={w.code} className="text-black">{w.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="hidden" id="submit-shipping">Continue</button>
                                </form>
                            </>
                        ) : (
                            <>
                                {/* Payment Step */}
                                <div>
                                    <h1 className="text-3xl md:text-3xl font-thin tracking-[0.1em] text-zen-green-900 dark:text-white uppercase mb-2">Secure Payment</h1>
                                    <p className="text-sm font-light text-zen-green-text/60 dark:text-gray-400">Please choose your preferred payment method.</p>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="space-y-4">
                                        {/* COD Option */}
                                        <label className={`group relative flex cursor-pointer rounded-xl border p-6 transition-all duration-300 shadow-sm hover:shadow-md ${paymentMethod === 'cod' ? 'border-zen-green-primary bg-zen-green-primary/5' : 'border-zen-green-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-zen-green-primary/50'}`}>
                                            <input
                                                type="radio"
                                                name="payment-method"
                                                className="peer sr-only"
                                                checked={paymentMethod === 'cod'}
                                                onChange={() => setPaymentMethod('cod')}
                                            />
                                            <span className={`absolute top-6 left-6 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${paymentMethod === 'cod' ? 'border-zen-green-primary' : 'border-gray-300 dark:border-gray-500'}`}>
                                                <span className={`h-2.5 w-2.5 rounded-full bg-zen-900 dark:bg-white opacity-0 transition-opacity ${paymentMethod === 'cod' ? 'opacity-100' : ''}`}></span>
                                            </span>
                                            <div className="ml-10 flex flex-col gap-1">
                                                <span className="block text-sm font-semibold uppercase tracking-wider text-zen-green-900 dark:text-white">Cash on Delivery (COD)</span>
                                                <span className="block text-sm font-light text-zen-green-text/60 dark:text-gray-400">Pay in cash upon delivery of your order.</span>
                                            </div>
                                            <div className={`ml-auto flex items-center transition-colors ${paymentMethod === 'cod' ? 'text-zen-green-primary' : 'text-gray-400'}`}>
                                                <span className="material-symbols-outlined font-light text-2xl">local_shipping</span>
                                            </div>
                                        </label>

                                        {/* Bank Transfer Option */}
                                        <label className={`group relative flex cursor-pointer rounded-xl border p-6 transition-all duration-300 shadow-sm hover:shadow-md ${paymentMethod === 'bank_transfer' ? 'border-zen-green-primary bg-zen-green-primary/5' : 'border-zen-green-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-zen-green-primary/50'}`}>
                                            <input
                                                type="radio"
                                                name="payment-method"
                                                className="peer sr-only"
                                                checked={paymentMethod === 'bank_transfer'}
                                                onChange={() => setPaymentMethod('bank_transfer')}
                                            />
                                            <span className={`absolute top-6 left-6 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${paymentMethod === 'bank_transfer' ? 'border-zen-green-primary' : 'border-gray-300 dark:border-gray-500'}`}>
                                                <span className={`h-2.5 w-2.5 rounded-full bg-zen-900 dark:bg-white opacity-0 transition-opacity ${paymentMethod === 'bank_transfer' ? 'opacity-100' : ''}`}></span>
                                            </span>
                                            <div className="ml-10 flex flex-col gap-1">
                                                <span className="block text-sm font-semibold uppercase tracking-wider text-zen-green-900 dark:text-white">Bank Transfer (VietQR)</span>
                                                <span className="block text-sm font-light text-zen-green-text/60 dark:text-gray-400">Instant payment via banking app. QR code provided next.</span>
                                            </div>
                                            <div className={`ml-auto flex items-center transition-colors ${paymentMethod === 'bank_transfer' ? 'text-zen-green-primary' : 'text-gray-400'}`}>
                                                <span className="material-symbols-outlined font-light text-2xl">qr_code_scanner</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Additional Info for Bank Transfer */}
                                    {paymentMethod === 'bank_transfer' && (
                                        <div className="bg-zen-green-primary/10 dark:bg-zen-green-primary/5 rounded-lg p-4 flex gap-3 items-start border border-zen-green-primary/20 animate-in fade-in slide-in-from-top-2">
                                            <span className="material-symbols-outlined text-zen-green-primary text-xl mt-0.5">info</span>
                                            <p className="text-xs font-light text-zen-green-text dark:text-gray-300 leading-relaxed">
                                                For Bank Transfer orders, you will be redirected to a secure payment gateway to scan your QR code immediately after clicking Complete Order. Please have your banking app ready.
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-8">
                                        <button
                                            onClick={() => setStep('shipping')}
                                            className="flex items-center gap-2 text-xs font-medium tracking-widest text-zen-green-text/60 hover:text-zen-green-900 dark:hover:text-white transition-colors uppercase group"
                                        >
                                            <span className="material-symbols-outlined text-sm transition-transform group-hover:-translate-x-1">arrow_back</span>
                                            Return to Shipping
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Sticky Order Summary */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-32 rounded-2xl bg-white dark:bg-[#1f2b16] p-8 shadow-sm border border-zen-green-100 dark:border-white/10 flex flex-col gap-8">
                            <h3 className="text-lg font-light tracking-widest text-zen-green-900 dark:text-white uppercase border-b border-zen-green-100 dark:border-white/10 pb-4">Order Summary</h3>

                            {/* Summary Items List */}
                            <div className="flex flex-col gap-4 text-sm max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map((item) => (
                                    <div key={item.key} className="flex justify-between items-start gap-4">
                                        <div className="flex gap-3">
                                            <div className="relative w-12 h-12 rounded bg-zen-green-100 overflow-hidden shrink-0">
                                                <ProductImage src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                                <span className="absolute top-0 right-0 bg-zen-green-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">{item.quantity}</span>
                                            </div>
                                            <div>
                                                <p className="uppercase text-xs font-medium text-zen-green-900 dark:text-white line-clamp-2">{item.title}</p>
                                                {item.variantName && <p className="text-[10px] text-zen-green-text/60">{item.variantName}</p>}
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-zen-green-200 dark:border-white/20 my-2"></div>

                            <div className="flex flex-col gap-4 text-sm">
                                <div className="flex justify-between items-center text-zen-green-900 dark:text-white">
                                    <span className="font-light tracking-wide">Subtotal</span>
                                    <span className="font-medium">{formatPrice(total)}</span>
                                </div>
                                <div className="flex justify-between items-center text-zen-green-900 dark:text-white">
                                    <span className="font-light tracking-wide">Shipping</span>
                                    <span className="text-zen-green-text/60 italic">{isFreeShipping ? 'Free' : formatPrice(shippingFee)}</span>
                                </div>
                                <div className="flex justify-between items-center text-zen-green-900 dark:text-white">
                                    <span className="font-light tracking-wide">Estimated Tax</span>
                                    <span className="font-medium">{formatPrice(estimatedTax)}</span>
                                </div>
                            </div>

                            {/* Discount Code Input */}
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-transparent border border-zen-green-200 dark:border-white/20 rounded-md px-4 py-2.5 text-xs tracking-widest uppercase text-zen-green-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-zen-green-primary transition-all"
                                    placeholder="GIFT CARD OR CODE"
                                    type="text"
                                />
                                <button className="bg-zen-green-100 dark:bg-white/10 hover:bg-zen-green-200 dark:hover:bg-white/20 text-zen-green-900 dark:text-white px-4 rounded-md text-xs font-bold tracking-widest uppercase transition-colors">Apply</button>
                            </div>

                            <div className="border-t border-dashed border-zen-green-200 dark:border-white/20 my-2"></div>

                            <div className="flex justify-between items-end">
                                <span className="text-base font-medium tracking-wide text-zen-green-900 dark:text-white uppercase">Total</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-zen-green-text/60 mb-1">VND</span>
                                    <span className="text-3xl font-light text-zen-green-900 dark:text-white">{formatPrice(finalTotal)}</span>
                                </div>
                            </div>

                            <button
                                onClick={step === 'shipping' ? () => document.getElementById('submit-shipping')?.click() : handleCompleteOrder}
                                disabled={isSubmitting}
                                className="w-full bg-zen-green-primary hover:bg-[#52b312] text-zen-900 dark:text-[#131b0e] py-4 rounded-lg text-sm font-bold tracking-widest uppercase shadow-lg shadow-zen-green-primary/20 transform active:scale-[0.99] transition-all duration-200 mt-2 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span>{step === 'shipping' ? 'Continue to Payment' : (isSubmitting ? 'Processing...' : 'Complete Order')}</span>
                                {!isSubmitting && <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                            </button>

                            <div className="flex justify-center items-center gap-2 text-zen-green-text/40 mt-2">
                                <span className="material-symbols-outlined text-[16px]">lock</span>
                                <span className="text-[10px] uppercase tracking-widest font-semibold">Encrypted & Secure</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <ZenFooter />
            <style jsx>{`
                .fade-in-section {
                    animation: fadeIn 0.5s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #d9e7d0;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}