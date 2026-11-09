'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Copy, Download } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';
import { getOrderStatus, setAccessToken } from '@/lib/api-client';
import { useAuth } from '@/components/providers/AuthProvider';
import { ShopFooter, ShopHeader } from '@/components/layout/ShopChrome';
import { SHOP_CONTACT } from '@/lib/legal';
import { useBilingual } from '@/hooks/useBilingual';
import { useCurrency } from '@/hooks/useCurrency';
import type { Order } from '@/types/order';

const BANK_CODE = process.env.NEXT_PUBLIC_BANK_CODE;
const BANK_ACC = process.env.NEXT_PUBLIC_BANK_ACC;
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME;
const vnd = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

function CopyRow({ label, value, shown, hint }: { label: string; value: string; shown?: string; hint?: string }) {
    const { t } = useBilingual();
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('Không sao chép được, bạn vui lòng ghi lại thủ công.', 'Could not copy. Please note it down.'));
        }
    };
    return (
        <div className="flex items-center justify-between gap-3 border-b border-trad-border-subtle py-3 last:border-b-0">
            <div className="min-w-0">
                <p className="shop-hint">{label}</p>
                <p className="break-all text-[15px] font-medium">{shown ?? value}</p>
                {hint && <p className="shop-hint mt-1">{hint}</p>}
            </div>
            <button type="button" onClick={copy} className="shop-btn shop-btn-secondary shrink-0 !min-h-11 !px-3" aria-label={`${t('Sao chép', 'Copy')}: ${label}`}>
                {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span className="text-sm">{copied ? t('Đã chép', 'Copied') : t('Sao chép', 'Copy')}</span>
            </button>
        </div>
    );
}

function Notice({ title, body }: { title: string; body: string }) {
    const { t } = useBilingual();
    return (
        <div className="shop-panel text-center">
            <h1 className="shop-title">{title}</h1>
            <p className="shop-lede">{body}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/contact" className="shop-btn">{t('Liên hệ cửa hàng', 'Contact the shop')}</Link>
                <Link href="/" className="shop-btn shop-btn-secondary">{t('Về trang chủ', 'Back to home')}</Link>
            </div>
        </div>
    );
}

export default function CheckoutPaymentPage() {
    const { en, t } = useBilingual();
    const { formatPrice } = useCurrency();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { session } = useAuth();
    const orderId = searchParams.get('id');
    const [order, setOrder] = useState<Partial<Order> | null>(null);
    const [loading, setLoading] = useState(Boolean(orderId));
    const [failed, setFailed] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [waiting, setWaiting] = useState(false);
    const polling = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = () => {
        if (polling.current) clearInterval(polling.current);
        polling.current = null;
    };

    const check = useCallback(async () => {
        if (!orderId) return null;
        const data = await getOrderStatus(orderId);
        if (data?.payment_status === 'paid') router.push(`/checkout/success?id=${orderId}`);
        return data;
    }, [orderId, router]);

    useEffect(() => {
        if (!orderId) return;
        if (session?.access_token) setAccessToken(session.access_token);
        let active = true;
        void check().then((data) => {
            if (!active) return;
            if (data) setOrder(data);
            else { setFailed(true); stopPolling(); }
            setLoading(false);
        });
        polling.current = setInterval(() => { void check().then((data) => { if (active && data) setOrder(data); }); }, 3000);
        return () => { active = false; stopPolling(); };
    }, [orderId, session?.access_token, check]);

    useEffect(() => {
        if (!order?.payment_deadline) return;
        const deadline = new Date(order.payment_deadline).getTime();
        const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [order?.payment_deadline]);

    const amount = Math.round(Number(order?.total ?? 0));
    const expired = remaining === 0 || order?.status === 'EXPIRED' || order?.status === 'CANCELED';
    const bankReady = !!(BANK_CODE && BANK_ACC && BANK_NAME);
    const qrUrl = order?.id && bankReady
        ? `https://qr.sepay.vn/img?bank=${BANK_CODE}&acc=${BANK_ACC}&template=compact&amount=${amount}&des=${order.id}`
        : '';

    const downloadQr = async () => {
        try {
            const response = await fetch(qrUrl);
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement('a');
            link.href = url;
            link.download = `vietqr-${order?.id}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            window.open(qrUrl, '_blank', 'noopener');
        }
    };

    const confirmPaid = async () => {
        const data = await check();
        if (data?.payment_status !== 'paid') setWaiting(true);
    };

    let content: React.ReactNode;
    if (loading) {
        content = <p role="status" className="shop-lede">{t('Đang tải thông tin thanh toán…', 'Loading payment details…')}</p>;
    } else if (!orderId || failed) {
        content = <Notice title={t('Không tìm thấy đơn hàng', 'Order not found')} body={t('Đường dẫn thanh toán không đúng hoặc đơn không còn tồn tại.', 'This payment link is not valid or the order no longer exists.')} />;
    } else if (expired) {
        content = <Notice title={t('Đơn đã hết hạn thanh toán', 'This order has expired')} body={t(`Nếu bạn đã chuyển tiền, vui lòng gọi ${SHOP_CONTACT.phone} để cửa hàng kiểm tra giúp bạn.`, `If you have already paid, please call ${SHOP_CONTACT.phone} and the shop will check it for you.`)} />;
    } else if (!bankReady) {
        content = <Notice title={t('Chưa hiển thị được thông tin chuyển khoản', 'Payment details are unavailable')} body={t(`Vui lòng gọi ${SHOP_CONTACT.phone} để cửa hàng hỗ trợ thanh toán đơn này.`, `Please call ${SHOP_CONTACT.phone} and the shop will help you pay for this order.`)} />;
    } else {
        const minutes = Math.floor((remaining ?? 0) / 60000);
        const seconds = Math.floor(((remaining ?? 0) % 60000) / 1000);
        content = (
            <div className="w-full max-w-[960px]">
                <p className="shop-eyebrow">{t('Thanh toán', 'Payment')}</p>
                <h1 className="shop-title">{t('Chuyển khoản để hoàn tất đơn', 'Transfer to complete your order')}</h1>
                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                    <section className="shop-card flex flex-col items-center gap-4 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- generated by the payment provider */}
                        <img src={qrUrl} alt={t('Mã VietQR để chuyển khoản', 'VietQR code for this transfer')} className="aspect-square w-full max-w-[280px] object-contain" />
                        <p className="shop-hint">{t('Mở ứng dụng ngân hàng và quét mã. Số tiền và nội dung đã được điền sẵn.', 'Open your banking app and scan the code. The amount and reference are filled in for you.')}</p>
                        <button type="button" onClick={downloadQr} className="shop-btn shop-btn-secondary w-full">
                            <Download size={18} aria-hidden="true" />
                            {t('Tải ảnh QR', 'Save QR image')}
                        </button>
                        {remaining !== null && (
                            <p className="text-sm" role="timer">
                                {t('Còn lại', 'Time left')}: <strong className="tabular-nums">{minutes}:{seconds.toString().padStart(2, '0')}</strong>
                            </p>
                        )}
                    </section>
                    <section className="shop-card">
                        <h2 className="font-serif text-2xl">{t('Hoặc chuyển khoản thủ công', 'Or transfer manually')}</h2>
                        <div className="mt-3">
                            <CopyRow label={t('Số tiền', 'Amount')} value={String(amount)} shown={vnd(amount)} hint={en ? `≈ ${formatPrice(amount)}` : undefined} />
                            <div className="border-b border-trad-border-subtle py-3">
                                <p className="shop-hint">{t('Ngân hàng', 'Bank')}</p>
                                <p className="text-[15px] font-medium">{BANK_CODE}</p>
                            </div>
                            <div className="border-b border-trad-border-subtle py-3">
                                <p className="shop-hint">{t('Chủ tài khoản', 'Account name')}</p>
                                <p className="text-[15px] font-medium">{BANK_NAME}</p>
                            </div>
                            <CopyRow label={t('Số tài khoản', 'Account number')} value={BANK_ACC ?? ''} />
                            <CopyRow label={t('Nội dung chuyển khoản', 'Transfer reference')} value={order?.id ?? ''} hint={t('Cần đúng nội dung này để đơn được xác nhận tự động.', 'Use this exact reference so the order is confirmed automatically.')} />
                        </div>
                        {waiting && <p role="status" className="shop-hint mt-4">{t('Chưa thấy tiền về. Trang sẽ tự chuyển khi ngân hàng xác nhận, thường trong vài phút.', 'We have not received it yet. This page will move on by itself once the bank confirms, usually within a few minutes.')}</p>}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <button type="button" onClick={confirmPaid} className="shop-btn flex-1">{t('Tôi đã chuyển khoản', 'I have paid')}</button>
                            <Link href={`/order-lookup?code=${order?.id ?? ''}`} className="shop-btn shop-btn-secondary flex-1">{t('Tra cứu đơn', 'Track order')}</Link>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-trad-bg-light font-display">
            <ShopHeader />
            <main className="shop-page">{content}</main>
            <ShopFooter />
        </div>
    );
}
