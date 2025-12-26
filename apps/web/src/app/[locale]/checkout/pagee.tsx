'use client';

import { useCart } from '@/components/providers/CartProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { createOrder, setAccessToken, getProfile } from '@/lib/api-client';
import { useRouter } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import ProductImage from '@/components/ui/ProductImage';
import LocationSelector from '@/components/checkout/LocationSelector';
import { useCurrency } from '@/hooks/useCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

export default function CheckoutPage() {
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

    // Store structured location
    const [locationParts, setLocationParts] = useState({
        province: '',
        district: '',
        ward: ''
    });

    const [error, setError] = useState<string | null>(null);

    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'sepay'>('cod');

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

                    if (profile.province && profile.district && profile.ward) {
                        setLocationParts(prev => {
                            if (prev.province) return prev;
                            return {
                                province: profile.province,
                                district: profile.district,
                                ward: profile.ward
                            };
                        });
                    }
                }
            }).catch(console.error);
        }
    }, [session]);

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!user || !session) {
            router.push('/login');
            return;
        }

        if (!locationParts.province || !locationParts.district || !locationParts.ward) {
            setError('Please select a valid location (Province/District/Ward).');
            return;
        }

        setLoading(true);
        try {
            setAccessToken(session.access_token);
            const orderItems = items.map(i => ({ productId: i.id, quantity: i.quantity }));

            // Construct full address for backend
            const fullShippingInfo = {
                ...shippingInfo,
                city: locationParts.province,
                address: `${shippingInfo.address}, ${locationParts.ward}, ${locationParts.district}, ${locationParts.province}`
            };

            // Call API with shipping info and payment method
            const order = await createOrder(orderItems, fullShippingInfo, paymentMethod);

            clearCart();

            if (paymentMethod === 'cod') {
                router.push(`/checkout/success?id=${order.id}`); // Or simple success page
            } else {
                router.push(`/checkout/payment?id=${order.id}`); // SePay payment page
            }
        } catch (e: any) {
            setError(e.message || 'Checkout failed. Please try again.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    // ... existing UI code ...

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 pt-24">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Cart Items + Shipping Form */}
                <div className="md:col-span-2 space-y-8">
                    {/* Cart List */}
                    {/* ... (keep existing cart list) ... */}
                    <div>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 flex items-start gap-2 animate-pulse">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <p className="font-bold">Cannot proceed with checkout:</p>
                                    <p>{error}</p>
                                </div>
                            </div>
                        )}
                        <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
                        <div className="space-y-4">
                            {items.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded shadow-sm flex gap-4 items-center">
                                    <div className="w-20 h-20 bg-gray-100 flex-shrink-0 relative">
                                        <ProductImage src={item.image} alt={item.title} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">{item.title}</h3>
                                        <p className="text-sm text-gray-500">{formatPrice(Number(item.price))}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button onClick={() => updateQuantity(item.id, -1)} variant="outline" size="sm">-</Button>
                                        <span>{item.quantity}</span>
                                        <Button onClick={() => updateQuantity(item.id, 1)} variant="outline" size="sm">+</Button>
                                    </div>
                                    <Button onClick={() => removeItem(item.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700">Remove</Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipping Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Shipping Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        required
                                        type="text"
                                        value={shippingInfo.name}
                                        onChange={e => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input
                                        id="phone"
                                        required
                                        type="tel"
                                        value={shippingInfo.phone}
                                        onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <LocationSelector
                                        key={`${locationParts.province}-${locationParts.district}-${locationParts.ward}`} // Re-render on load
                                        initialProvince={locationParts.province}
                                        initialDistrict={locationParts.district}
                                        initialWard={locationParts.ward}
                                        onLocationChange={(loc) => {
                                            setLocationParts({
                                                province: loc.province,
                                                district: loc.district,
                                                ward: loc.ward
                                            });
                                        }}
                                    />
                                    <div className="space-y-2">
                                        <Label htmlFor="street">House No. / Street Name</Label>
                                        <Input
                                            id="street"
                                            required
                                            type="text"
                                            placeholder="e.g. 123 Nguyen Hue"
                                            value={shippingInfo.address}
                                            onChange={e => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Method Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Method</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cod' | 'sepay')}>
                                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                                    <RadioGroupItem value="cod" id="cod" />
                                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                                        <div>
                                            <span className="font-bold block">Cash on Delivery (COD)</span>
                                            <span className="text-sm text-muted-foreground">Pay when you receive the package.</span>
                                        </div>
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                                    <RadioGroupItem value="sepay" id="sepay" />
                                    <Label htmlFor="sepay" className="flex-1 cursor-pointer">
                                        <div>
                                            <span className="font-bold block text-green-700">Bank Transfer (VietQR)</span>
                                            <span className="text-sm text-muted-foreground">Scan QR Code for instant payment confirmation.</span>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Summary */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded shadow-sm sticky top-24">
                        <h2 className="text-xl font-bold mb-4">Summary</h2>
                        <div className="flex justify-between mb-2">
                            <span>Subtotal</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                        <div className="flex justify-between mb-6 font-bold text-lg border-t pt-4">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>

                        {!user ? (
                            <p className="text-sm text-red-500 mb-2">Please login to checkout</p>
                        ) : null}

                        <Button
                            onClick={handleCheckout}
                            disabled={loading || !user || !shippingInfo.name || !shippingInfo.phone || !shippingInfo.address}
                            className="w-full"
                            size="lg"
                        >
                            {loading ? 'Processing...' : 'Place Order'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
