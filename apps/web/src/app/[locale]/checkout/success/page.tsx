'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Check, CircleCheck, Copy } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { useAuth } from '@/components/providers/AuthProvider';
import { getOrder, setAccessToken } from '@/lib/api-client';
import ProductImage from '@/components/ui/ProductImage';
import { PurchaseCapture } from '@/components/analytics/PurchaseCapture';
import { ShopFooter, ShopHeader } from '@/components/layout/ShopChrome';
import { SHOP_CONTACT } from '@/lib/legal';
import { useBilingual } from '@/hooks/useBilingual';
import { useCurrency } from '@/hooks/useCurrency';

type LineItem = { title: string; image?: string; quantity: number; price: number | string; variant_name?: string | null };
type PlacedOrder = {
    items?: LineItem[];
    total: number;
    voucher_code?: string | null;
    voucher_discount_amount?: number | null;
    shipping_info?: { shipping_fee?: number; delivery_method?: string } | null;
};

export default function CheckoutSuccessPage() {
    const { t } = useBilingual();
    const { formatPrice } = useCurrency();
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('id');
    const { session } = useAuth();
    const [order, setOrder] = useState<PlacedOrder | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!orderId) { router.push('/'); return; }
        if (session?.access_token) {
            setAccessToken(session.access_token);
            getOrder(orderId).then((data) => setOrder(data as unknown as PlacedOrder)).catch(() => undefined);
        }
    }, [orderId, router, session]);

    const copyId = async () => {
        if (!orderId) return;
        try {
            await navigator.clipboard.writeText(orderId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('Không sao chép được, bạn vui lòng ghi lại thủ công.', 'Could not copy. Please note it down.'));
        }
    };

    if (!orderId) return null;

    const shippingFee = Number(order?.shipping_info?.shipping_fee ?? 0);
    const voucher = Number(order?.voucher_discount_amount ?? 0);
    const pickup = order?.shipping_info?.delivery_method === 'pickup';

    return (
        <div className="atelier-page flex min-h-screen flex-col bg-trad-bg-light font-display">
            <PurchaseCapture orderId={orderId} />
            <ShopHeader />
            <main className="shop-page">
                <div className="shop-panel flex flex-col gap-6">
                    <div className="text-center">
                        <CircleCheck size={40} strokeWidth={1.4} className="mx-auto mb-4 text-trad-primary" aria-hidden="true" />
                        <h1 className="shop-title">{t('Đặt hàng thành công', 'Thank you for your order')}</h1>
                        <p className="shop-lede">{t('Thiên Phúc đã nhận đơn và sẽ liên hệ khi đơn được gửi đi.', 'Thiên Phúc has received your order and will let you know when it ships.')}</p>
                    </div>

                    <section className="shop-card">
                        <p className="shop-hint">{t('Mã đơn hàng', 'Order code')}</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                            <p className="min-w-0 break-all text-[15px] font-medium">{orderId}</p>
                            <button type="button" onClick={copyId} className="shop-btn shop-btn-secondary shrink-0 !min-h-11 !px-3" aria-label={t('Sao chép mã đơn hàng', 'Copy order code')}>
                                {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                                <span className="text-sm">{copied ? t('Đã chép', 'Copied') : t('Sao chép', 'Copy')}</span>
                            </button>
                        </div>
                        {!session && <p className="shop-hint mt-3">{t('Bạn đặt hàng không cần tài khoản, hãy lưu mã này để tra cứu đơn sau.', 'You checked out without an account, so please keep this code to track your order.')}</p>}
                    </section>

                    {order?.items && order.items.length > 0 && (
                        <section className="shop-card flex flex-col gap-4">
                            <h2 className="font-serif text-xl">{t('Sản phẩm đã đặt', 'Your items')}</h2>
                            <ul className="flex flex-col gap-3">
                                {order.items.map((item, index) => (
                                    <li key={`${item.title}-${index}`} className="flex items-center gap-3">
                                        <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-trad-bg-warm">
                                            <ProductImage src={item.image} alt="" className="h-full w-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px]">{item.title}</p>
                                            <p className="shop-hint">{item.variant_name ? `${item.variant_name} · ` : ''}× {item.quantity}</p>
                                        </div>
                                        <span className="text-sm">{formatPrice(Number(item.price))}</span>
                                    </li>
                                ))}
                            </ul>
                            <dl className="shop-rows border-t border-trad-border-warm pt-4">
                                {voucher > 0 && <div><dt>{t('Mã giảm giá', 'Voucher')}{order.voucher_code ? ` (${order.voucher_code})` : ''}</dt><dd>-{formatPrice(voucher)}</dd></div>}
                                <div><dt>{t('Phí vận chuyển', 'Shipping')}</dt><dd>{pickup ? t('Nhận tại cửa hàng', 'Store pickup') : shippingFee > 0 ? formatPrice(shippingFee) : t('Miễn phí', 'Free')}</dd></div>
                                <div className="shop-total"><dt className="!text-trad-text-main">{t('Tổng cộng', 'Total')}</dt><dd>{formatPrice(order.total)}</dd></div>
                            </dl>
                        </section>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link href={session ? `/account/orders/${orderId}` : `/order-lookup?code=${orderId}`} className="shop-btn flex-1">
                            {session ? t('Xem đơn hàng', 'View order') : t('Tra cứu đơn hàng', 'Track order')}
                        </Link>
                        <Link href="/products" className="shop-btn shop-btn-secondary flex-1">{t('Tiếp tục mua sắm', 'Keep shopping')}</Link>
                    </div>

                    {!session && (
                        <p className="shop-hint text-center">
                            {t('Muốn lưu địa chỉ và xem lại đơn dễ hơn?', 'Want to save your address and see past orders?')}{' '}
                            <Link href="/login" className="shop-link">{t('Tạo tài khoản', 'Create an account')}</Link>
                        </p>
                    )}
                    <p className="shop-hint text-center">
                        {t('Cần hỗ trợ?', 'Need help?')}{' '}
                        <a href={`tel:${SHOP_CONTACT.phone}`} className="shop-link">{SHOP_CONTACT.phone}</a>
                    </p>
                </div>
            </main>
            <ShopFooter />
        </div>
    );
}
