'use client';

import { Link } from '@/i18n/routing';
import { ShopFooter, ShopHeader } from '@/components/layout/ShopChrome';
import { useBilingual } from '@/hooks/useBilingual';

export default function ShopNotFound() {
    const { t } = useBilingual();
    return (
        <div className="atelier-page flex min-h-screen flex-col bg-trad-bg-light font-display">
            <ShopHeader />
            <main className="shop-page justify-center">
                <div className="shop-panel text-center">
                    <p className="shop-eyebrow">404</p>
                    <h1 className="shop-title">{t('Không tìm thấy trang này', 'We could not find that page')}</h1>
                    <p className="shop-lede">{t('Đường dẫn có thể đã thay đổi. Bạn thử quay lại cửa hàng nhé.', 'The link may have changed. Try heading back to the shop.')}</p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link href="/products" className="shop-btn">{t('Xem sản phẩm', 'Browse products')}</Link>
                        <Link href="/" className="shop-btn shop-btn-secondary">{t('Về trang chủ', 'Back to home')}</Link>
                    </div>
                </div>
            </main>
            <ShopFooter />
        </div>
    );
}
