'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { lookupOrder, type OrderLookupResult } from '@/lib/api-client';
import { ShopFooter, ShopHeader } from '@/components/layout/ShopChrome';
import { useBilingual } from '@/hooks/useBilingual';
import { useCurrency } from '@/hooks/useCurrency';

const STATUS: Record<string, { vi: string; en: string; tone: string }> = {
    PENDING: { vi: 'Đang xử lý', en: 'Processing', tone: 'wait' },
    AWAITING_PAYMENT: { vi: 'Chờ thanh toán', en: 'Awaiting payment', tone: 'wait' },
    PAID: { vi: 'Đã xác nhận', en: 'Confirmed', tone: 'move' },
    SHIPPED: { vi: 'Đang giao', en: 'On its way', tone: 'move' },
    COMPLETED: { vi: 'Hoàn thành', en: 'Delivered', tone: 'done' },
    CANCELED: { vi: 'Đã hủy', en: 'Canceled', tone: 'stop' },
    EXPIRED: { vi: 'Hết hạn thanh toán', en: 'Payment expired', tone: 'stop' },
};

type LineItem = OrderLookupResult['items'][number] & {
    original_price?: number | string;
    discount_amount?: number | string;
};

function OrderResult({ order }: { order: OrderLookupResult }) {
    const { en, t } = useBilingual();
    const { formatPrice } = useCurrency();
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { heading.current?.focus(); }, [order.id]);

    const status = STATUS[order.status];
    const items = order.items as LineItem[];
    const subtotal = items.reduce((sum, item) => sum + Number(item.original_price || item.price || 0) * Number(item.quantity || 1), 0);
    const productDiscount = items.reduce((sum, item) => sum + Number(item.discount_amount || 0) * Number(item.quantity || 1), 0);
    const voucherDiscount = Number(order.voucher_discount_amount || 0);
    const shippingFee = Number(order.shipping_info?.shipping_fee || 0);
    const pickup = order.shipping_info?.delivery_method === 'pickup';
    const paid = order.payment_status === 'paid';
    const method = order.payment_method === 'sepay'
        ? t('Chuyển khoản ngân hàng', 'Bank transfer')
        : t('Thanh toán khi nhận hàng', 'Cash on delivery');

    return (
        <section className="shop-card mt-6 flex flex-col gap-6" aria-labelledby="order-result-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id="order-result-title" ref={heading} tabIndex={-1} className="font-serif text-2xl outline-none">
                        {t('Đơn', 'Order')} #{order.id.slice(0, 8)}
                    </h2>
                    <p className="shop-hint mt-1">
                        {t('Đặt ngày', 'Placed on')} {new Date(order.created_at).toLocaleDateString(en ? 'en-GB' : 'vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <span className="shop-status" data-tone={status?.tone}>{status ? (en ? status.en : status.vi) : order.status}</span>
            </div>

            <ul className="flex flex-col gap-3">
                {items.map((item, index) => (
                    <li key={`${item.title}-${index}`} className="flex items-center gap-3">
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-[3px] bg-trad-bg-warm">
                            {item.image && <Image src={item.image} alt="" fill sizes="56px" className="object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px]">{item.title}</p>
                            <p className="shop-hint">{item.variant_name ? `${item.variant_name} · ` : ''}{formatPrice(Number(item.price))}</p>
                        </div>
                        <span className="text-sm text-trad-text-muted">× {item.quantity}</span>
                    </li>
                ))}
            </ul>

            <dl className="shop-rows">
                <div><dt>{t('Tạm tính', 'Subtotal')}</dt><dd>{formatPrice(subtotal)}</dd></div>
                {productDiscount > 0 && <div><dt>{t('Giảm giá sản phẩm', 'Product discount')}</dt><dd>-{formatPrice(productDiscount)}</dd></div>}
                {voucherDiscount > 0 && <div><dt>{t('Mã giảm giá', 'Voucher')}{order.voucher_code ? ` (${order.voucher_code})` : ''}</dt><dd>-{formatPrice(voucherDiscount)}</dd></div>}
                <div>
                    <dt>{t('Phí vận chuyển', 'Shipping')}</dt>
                    <dd>{pickup ? t('Nhận tại cửa hàng', 'Store pickup') : shippingFee > 0 ? formatPrice(shippingFee) : t('Miễn phí', 'Free')}</dd>
                </div>
                <div className="shop-total"><dt className="!text-trad-text-main">{t('Tổng cộng', 'Total')}</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>

            <dl className="shop-rows border-t border-trad-border-warm pt-5">
                <div><dt>{t('Thanh toán', 'Payment')}</dt><dd>{method} · {paid ? t('Đã thanh toán', 'Paid') : t('Chưa thanh toán', 'Not paid yet')}</dd></div>
                {order.shipping_info?.full_name && <div><dt>{t('Người nhận', 'Recipient')}</dt><dd>{order.shipping_info.full_name}</dd></div>}
                {order.tracking_code && <div><dt>{t('Mã vận đơn', 'Tracking code')}</dt><dd>{order.tracking_code}</dd></div>}
            </dl>
        </section>
    );
}

export default function OrderLookup() {
    const searchParams = useSearchParams();
    const { t } = useBilingual();
    const [orderCode, setOrderCode] = useState(searchParams.get('code') ?? '');
    const [contact, setContact] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<OrderLookupResult | null>(null);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setResult(null);
        setLoading(true);
        try {
            setResult(await lookupOrder(orderCode.trim(), contact.trim()));
        } catch (failure: unknown) {
            const status = (failure as { status?: number } | null)?.status;
            setError(
                status === 429
                    ? t('Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau một phút.', 'Too many attempts. Please try again in a minute.')
                    : status === 404
                        ? t('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và thông tin liên hệ.', 'We could not find that order. Please check the order code and contact details.')
                        : t('Chưa tra cứu được. Vui lòng thử lại sau ít phút.', 'The lookup did not go through. Please try again shortly.'),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="atelier-page flex min-h-screen flex-col bg-trad-bg-light font-display">
            <ShopHeader />
            <main className="shop-page">
                <div className="shop-panel">
                    <p className="shop-eyebrow">{t('Đơn hàng', 'Your order')}</p>
                    <h1 className="shop-title">{t('Tra cứu đơn hàng', 'Track your order')}</h1>
                    <p className="shop-lede">{t('Mã đơn có trong email xác nhận và trang đặt hàng thành công.', 'You will find the order code in your confirmation email and on the order success page.')}</p>

                    <form onSubmit={submit} className="shop-card mt-8 flex flex-col gap-5">
                        <label className="shop-field">
                            {t('Mã đơn hàng', 'Order code')}
                            <input required value={orderCode} onChange={(event) => setOrderCode(event.target.value)} autoComplete="off" spellCheck={false} />
                        </label>
                        <label className="shop-field">
                            {t('Số điện thoại hoặc email', 'Phone number or email')}
                            <input required value={contact} onChange={(event) => setContact(event.target.value)} autoComplete="on" />
                            <span className="shop-hint">{t('Dùng đúng thông tin bạn đã nhập khi đặt hàng.', 'Use the same details you entered at checkout.')}</span>
                        </label>
                        {error && <p role="alert" className="shop-error">{error}</p>}
                        <button type="submit" disabled={loading} className="w-full">
                            {loading ? t('Đang tra cứu…', 'Looking up…') : t('Tra cứu', 'Find my order')}
                        </button>
                    </form>

                    {result && <OrderResult order={result} />}

                    <p className="shop-hint mt-6 text-center">
                        {t('Cần hỗ trợ?', 'Need help?')}{' '}
                        <Link href="/contact" className="shop-link">{t('Liên hệ cửa hàng', 'Contact the shop')}</Link>
                    </p>
                </div>
            </main>
            <ShopFooter />
        </div>
    );
}
