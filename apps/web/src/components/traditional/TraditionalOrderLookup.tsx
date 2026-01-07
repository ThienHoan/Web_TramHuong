'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { lookupOrder, OrderLookupResult } from '@/lib/api-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import Image from 'next/image';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';

export default function TraditionalOrderLookup() {
    const searchParams = useSearchParams();
    const [orderCode, setOrderCode] = useState('');
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<OrderLookupResult | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) setOrderCode(code);
    }, [searchParams]);

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const data = await lookupOrder(orderCode, emailOrPhone);
            setResult(data);
            setShowModal(true);
        } catch (err: any) {
            setError(err.message || 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            AWAITING_PAYMENT: 'bg-orange-100 text-orange-800 border-orange-200',
            PAID: 'bg-blue-100 text-blue-800 border-blue-200',
            SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
            COMPLETED: 'bg-green-100 text-green-800 border-green-200',
            CANCELED: 'bg-red-100 text-red-800 border-red-200',
        };
        const labels: Record<string, string> = {
            PENDING: 'Đang xử lý',
            AWAITING_PAYMENT: 'Chờ thanh toán',
            PAID: 'Đã thanh toán',
            SHIPPED: 'Đang vận chuyển',
            COMPLETED: 'Hoàn thành',
            CANCELED: 'Đã hủy',
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status === 'SHIPPED' && (
                    <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                    </span>
                )}
                {labels[status] || status}
            </span>
        );
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-trad-bg-light font-display flex flex-col">
            <TraditionalHeader />

            <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden py-20 lg:py-28">
                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none z-0 opacity-100 mix-blend-multiply bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNlYzEzMWUiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0dj0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNFY0aC00ek02IDM0di00SDR2NEgwdjJoNHY0aDJ2LTRoNHYtMkg2ek02IDRWMEg0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')]"></div>
                <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-b from-transparent to-white/40"></div>

                <div className="layout-content-container flex flex-col max-w-[1100px] w-full relative z-10 my-auto">
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-[#9a4c50]/5 overflow-hidden border border-[#e7cfd0]/30 flex flex-col lg:flex-row min-h-[600px]">
                        {/* Visual Storytelling (Left) */}
                        <div className="w-full lg:w-1/2 relative bg-[#fcf8f8] overflow-hidden group">
                            <div className="absolute inset-0 z-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#fdf6f0] via-[#fffbf2] to-[#fcedeb] opacity-80"></div>
                            </div>
                            <div className="absolute top-10 right-10 w-24 h-24 rounded-full bg-gradient-to-tr from-[#ec131e]/5 to-transparent blur-2xl"></div>
                            <div className="relative z-10 w-full h-full flex flex-col p-8 md:p-12 justify-between">
                                <div className="space-y-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fff7e6] border border-[#e7cfd0] text-[#9a4c50] text-xs font-bold uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-sm">history_edu</span>
                                        <span>Câu Chuyện Của Trầm</span>
                                    </div>
                                    <h1 className="text-[#1b0d0e] text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-[-0.02em] font-serif">
                                        Hành trình của tinh hoa đang chờ bạn khám phá
                                    </h1>
                                    <p className="text-[#5c3a3c] text-lg font-medium leading-relaxed max-w-md">
                                        Từ rừng già linh thiêng đến không gian an yên của bạn. Mỗi nén trầm là một câu chuyện về thời gian và sự tận tụy.
                                    </p>
                                </div>
                                <div className="relative w-full aspect-[4/3] mt-8 rounded-2xl overflow-hidden shadow-lg border-4 border-white transform transition-transform duration-700 group-hover:scale-[1.02]">
                                    <div className="w-full h-full bg-center bg-cover bg-no-repeat bg-[url('https://lh3.googleusercontent.com/aida-public/AB6AXuCcXwXKGoExp3Ox5JUIrkse8nYf2eaD2vDm-iDiNzEP_f1lelQBHY7NzhkuGHKonq9CqcYbEF7gAt_OXfh-TVq1_ILFEq4pWN-huQYSYI-ShieD1AEm3AIr5-HfVykdbfbk0_lRzfxAq1KveU-wB3cPIVadnoKHEeTOjWpTuk4QYaxDiX1zxUATnJMmXX2dzty1zVzEq4qVkLLnHFqiiELBTgY8IF9UqwOzjSrrZZQtrO0k9G_dQ105wlYRl8wKXSYoGUQ72WKhNqxx')]">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent mix-blend-multiply"></div>
                                    </div>
                                    <div className="absolute bottom-4 right-4 opacity-80">
                                        <div className="w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                                            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Thiên Phúc</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lookup Form (Right) */}
                        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
                            <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-20">
                                <span className="material-symbols-outlined text-6xl text-[#ec131e]">local_florist</span>
                            </div>
                            <div className="max-w-md mx-auto w-full">
                                <div className="mb-10 text-center lg:text-left">
                                    <h2 className="text-[#1b0d0e] text-2xl font-bold mb-3 font-serif">Tra Cứu Đơn Hàng</h2>
                                    <p className="text-[#9a4c50] text-base font-normal">Bạn muốn theo dấu hương trầm? Hãy nhập thông tin bên dưới để bắt đầu.</p>
                                </div>

                                <form onSubmit={handleLookup} className="flex flex-col gap-6">
                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertTitle>Lỗi</AlertTitle>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <label className="flex flex-col w-full group">
                                        <span className="text-[#1b0d0e] text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-[#9a4c50]">receipt_long</span>
                                            Mã Đơn Hàng
                                        </span>
                                        <input
                                            required
                                            className="form-input flex w-full resize-none overflow-hidden rounded-xl text-[#1b0d0e] focus:outline-none focus:ring-2 focus:ring-[#ec131e]/20 border border-[#e7cfd0] bg-[#fcf8f8] focus:bg-white focus:border-[#ec131e] transition-all duration-300 h-14 placeholder:text-[#9a4c50]/50 px-4 text-base font-normal"
                                            placeholder="Ví dụ: b3f2..."
                                            value={orderCode}
                                            onChange={(e) => setOrderCode(e.target.value)}
                                        />
                                    </label>

                                    <label className="flex flex-col w-full group">
                                        <span className="text-[#1b0d0e] text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-base text-[#9a4c50]">contact_mail</span>
                                            Số Điện Thoại hoặc Email
                                        </span>
                                        <input
                                            required
                                            className="form-input flex w-full resize-none overflow-hidden rounded-xl text-[#1b0d0e] focus:outline-none focus:ring-2 focus:ring-[#ec131e]/20 border border-[#e7cfd0] bg-[#fcf8f8] focus:bg-white focus:border-[#ec131e] transition-all duration-300 h-14 placeholder:text-[#9a4c50]/50 px-4 text-base font-normal"
                                            placeholder="Nhập thông tin xác thực"
                                            value={emailOrPhone}
                                            onChange={(e) => setEmailOrPhone(e.target.value)}
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="mt-4 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 bg-[#ec131e] text-white hover:bg-[#c40f19] active:bg-[#a30c15] active:scale-[0.98] transition-all duration-200 gap-3 text-base font-bold tracking-[0.02em] shadow-lg shadow-[#ec131e]/30 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <span>Đang tra cứu...</span>
                                        ) : (
                                            <>
                                                <span>Tra Cứu Hành Trình</span>
                                                <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="mt-8 text-center pt-6 border-t border-[#f3e7e8]">
                                    <p className="text-[#5c3a3c] text-sm">
                                        Gặp khó khăn khi tìm kiếm? {' '}
                                        <Link href="/contact" className="text-[#ec131e] font-bold hover:underline underline-offset-4 decoration-[#ec131e]/30 hover:decoration-[#ec131e]">
                                            Liên hệ hỗ trợ
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Trust Indicators */}
                    <div className="mt-8 flex justify-center gap-8 opacity-60">
                        <div className="flex items-center gap-2 text-[#5c3a3c] text-xs font-semibold uppercase tracking-widest">
                            <span className="material-symbols-outlined text-lg">verified</span>
                            <span>Chính Hãng</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#5c3a3c] text-xs font-semibold uppercase tracking-widest">
                            <span className="material-symbols-outlined text-lg">local_shipping</span>
                            <span>Giao Nhanh</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#5c3a3c] text-xs font-semibold uppercase tracking-widest">
                            <span className="material-symbols-outlined text-lg">support_agent</span>
                            <span>Hỗ Trợ 24/7</span>
                        </div>
                    </div>
                </div>

                {/* Modal Dialog */}
                {showModal && result && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">

                        <div className="absolute inset-0 bg-[#221011]/70 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>

                        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-[2rem] bg-[#fffbf2] text-left shadow-2xl transition-all flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                            <div className="absolute inset-0 pointer-events-none z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNlYzEzMWUiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0di00aC0ydjRoLTR2Mmg0djRoMnYtNGg0dj0yaC00em0wLTMwVjBoLTJ2NGgtNHYyaDR2NGgyVjZoNFY0aC00ek02IDM0di00SDR2NEgwdjJoNHY0aDJ2LTRoNHYtMkg2ek02IDRWMEg0djRIMHYyaDR2NGgyVjZoNFY0SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20 mix-blend-multiply"></div>
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <span className="material-symbols-outlined text-9xl text-[#b45309]">spa</span>
                            </div>

                            <div className="relative z-10 px-6 py-6 md:px-8 border-b border-[#e7cfd0]/50 flex justify-between items-start bg-white/40">
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-[#b45309] font-serif tracking-tight">Hành Trình Hương Trầm</h3>
                                    <p className="mt-1 text-[#5c3a3c] text-sm font-medium italic">"Mỗi đơn hàng là một duyên lành"</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="group -mr-2 -mt-2 p-2 rounded-full hover:bg-[#e7cfd0]/30 transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[#9a4c50] group-hover:text-[#ec131e]">close</span>
                                </button>
                            </div>

                            <div className="relative z-10 p-6 md:p-8 overflow-y-auto flex-1">
                                {/* Header Info */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#e7cfd0]/50 border-dashed">
                                    <div>
                                        <span className="text-[#9a4c50] text-xs font-bold uppercase tracking-widest mb-1 block flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">bookmark</span>
                                            Mã Đơn
                                        </span>
                                        <h4 className="text-xl font-bold text-[#1b0d0e] font-serif truncate max-w-[200px]" title={result.id}>
                                            #{result.id.slice(0, 8)}...
                                        </h4>
                                        <p className="text-[#5c3a3c] text-sm mt-1">Ngày đặt: {formatDate(result.created_at)}</p>
                                    </div>
                                    <div>
                                        {getStatusBadge(result.status)}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="mb-8">
                                    <h5 className="text-[#1b0d0e] font-bold text-lg font-serif mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#9a4c50]">deployed_code</span>
                                        Vật Phẩm
                                    </h5>
                                    <div className="space-y-3">
                                        {result.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-[#e7cfd0]/60 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e7cfd0]/30 bg-[#f9f5f5] flex items-center justify-center text-[#e7cfd0]">
                                                    {item.image ? (
                                                        <Image src={item.image} alt={item.title} width={64} height={64} className="object-cover w-full h-full" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-3xl">image</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-base font-bold text-[#1b0d0e] font-serif truncate">{item.title}</p>
                                                    <p className="text-sm text-[#5c3a3c]">
                                                        {item.variant_name || 'Tiêu chuẩn'} • {formatPrice(item.price)}
                                                    </p>
                                                </div>
                                                <div className="text-[#1b0d0e] font-semibold bg-[#f3e7e8] px-3 py-1 rounded-lg text-sm">x{item.quantity}</div>
                                            </div>

                                        ))}
                                    </div>
                                </div>

                                {/* Shipping & Payment */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-5 rounded-2xl bg-[#fffaf5] border border-[#fed7aa]/50 relative group">
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className="mt-1 p-2 bg-white rounded-full text-[#ea580c] shadow-sm border border-[#fed7aa]/30">
                                                <span className="material-symbols-outlined text-xl">local_shipping</span>
                                            </div>
                                            <div>
                                                <h6 className="font-bold text-[#1b0d0e] mb-1">Giao đến</h6>
                                                <p className="text-sm text-[#5c3a3c] font-semibold">{result.shipping_info.full_name}</p>
                                                {result.shipping_info.phone && <p className="text-sm text-[#5c3a3c] mt-0.5">{result.shipping_info.phone}</p>}
                                                {result.shipping_info.address && <p className="text-sm text-[#5c3a3c]/80 mt-1 leading-snug">{result.shipping_info.address}</p>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0]/50 relative group">
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className="mt-1 p-2 bg-white rounded-full text-[#16a34a] shadow-sm border border-[#bbf7d0]/30">
                                                <span className="material-symbols-outlined text-xl">payments</span>
                                            </div>
                                            <div className="w-full">
                                                <h6 className="font-bold text-[#1b0d0e] mb-2">Thanh toán</h6>

                                                {/* Price Breakdown */}
                                                {(() => {
                                                    // Calculate subtotal from items (original prices * quantity)
                                                    const subtotal = result.items?.reduce((sum: number, item: any) => {
                                                        const price = Number(item.original_price || item.price || 0);
                                                        return sum + (price * Number(item.quantity || 1));
                                                    }, 0) || 0;

                                                    // Calculate product discount savings
                                                    const productDiscount = result.items?.reduce((sum: number, item: any) => {
                                                        const discountAmount = Number(item.discount_amount || 0);
                                                        return sum + (discountAmount * Number(item.quantity || 1));
                                                    }, 0) || 0;

                                                    // Voucher discount
                                                    const voucherDiscount = Number(result.voucher_discount_amount || 0);

                                                    // Shipping fee from shipping_info
                                                    const shippingFee = Number(result.shipping_info?.shipping_fee || 0);

                                                    // Check if shipping is free (subtotal >= 300k or pickup)
                                                    const subtotalAfterDiscount = subtotal - productDiscount;
                                                    const isFreeShipping = shippingFee === 0 && subtotalAfterDiscount >= 300000;
                                                    const isPickup = result.shipping_info?.delivery_method === 'pickup';

                                                    return (
                                                        <div className="space-y-1.5 border-b border-[#bbf7d0]/50 pb-3 mb-3">
                                                            {/* Subtotal */}
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-[#5c3a3c]">Tạm tính</span>
                                                                <span className="text-[#1b0d0e]">{formatPrice(subtotal)}</span>
                                                            </div>

                                                            {/* Product Discount */}
                                                            {productDiscount > 0 && (
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-[#5c3a3c] flex items-center gap-1">

                                                                        Giảm giá sản phẩm
                                                                    </span>
                                                                    <span className="text-red-500 font-medium">-{formatPrice(productDiscount)}</span>
                                                                </div>
                                                            )}



                                                            {/* Shipping Fee */}
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="text-[#5c3a3c] flex items-center gap-1">

                                                                    Phí vận chuyển
                                                                </span>
                                                                {isPickup ? (
                                                                    <span className="text-green-600 font-medium text-xs">Nhận tại cửa hàng</span>
                                                                ) : isFreeShipping ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[#9a9a9a] line-through text-xs">{formatPrice(30000)}</span>
                                                                        <span className="text-green-600 font-medium">Miễn phí</span>
                                                                    </div>
                                                                ) : shippingFee > 0 ? (
                                                                    <span className="text-[#1b0d0e]">{formatPrice(shippingFee)}</span>
                                                                ) : (
                                                                    <span className="text-green-600 font-medium">Miễn phí</span>
                                                                )}
                                                            </div>

                                                            {/* Voucher Discount */}
                                                            {voucherDiscount > 0 && (
                                                                <div className="flex justify-between items-center text-sm">
                                                                    <span className="text-[#5c3a3c] flex items-center gap-1">
                                                                        Voucher {result.voucher_code && <span className="text-xs text-purple-600">({result.voucher_code})</span>}
                                                                    </span>
                                                                    <span className="text-purple-600 font-medium">-{formatPrice(voucherDiscount)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Total */}
                                                <div className="flex justify-between items-baseline w-full">
                                                    <span className="text-sm font-semibold text-[#1b0d0e]">Tổng cộng</span>
                                                    <span className="text-xl font-bold text-[#16a34a]">{formatPrice(result.total)}</span>
                                                </div>

                                                {/* Payment Status */}
                                                <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#15803d] bg-[#dcfce7] px-2 py-1 rounded-md border border-[#bbf7d0]">
                                                    {result.payment_status === 'paid' ? (
                                                        <>
                                                            <span className="material-symbols-outlined text-[14px]">check</span>
                                                            ĐÃ THANH TOÁN
                                                        </>
                                                    ) : (
                                                        <span className="text-orange-700">CHƯA THANH TOÁN</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 px-6 py-5 md:px-8 bg-white border-t border-[#e7cfd0]/50 flex flex-col sm:flex-row justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#e7cfd0] text-[#5c3a3c] font-bold hover:bg-[#f3e7e8] hover:text-[#1b0d0e] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e7cfd0] cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <TraditionalFooter />
        </div>
    );
}
