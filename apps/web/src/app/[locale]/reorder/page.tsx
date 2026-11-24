import type { Metadata } from 'next';
import { ShopHeader, ShopFooter } from '@/components/layout/ShopChrome';
import { Link } from '@/i18n/routing';
import ReorderButton from '@/components/shop/ReorderButton';
import { parseReorderSelection } from '@/lib/reorder';
import '@/components/shop/shop.css';

export const metadata: Metadata = { title: 'Mua lại sản phẩm · Reorder', robots: { index: false, follow: false } };
export default async function ReorderPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ items?: string }> }) {
  const { locale } = await params, search = await searchParams, en = locale === 'en';
  const lines = parseReorderSelection(search.items);
  return <div className="atelier-page"><ShopHeader /><main className="shop-page"><div className="shop-panel">
    <h1 className="shop-title">{en ? 'Buy your favourites again' : 'Mua lại sản phẩm'}</h1>
    {lines.length ? <><p className="shop-lede">{en ? 'Check today’s prices and availability for the products from your email. You can order without an account.' : 'Kiểm tra giá và tồn kho hiện tại của các món trong email. Bạn có thể đặt hàng không cần tài khoản.'}</p><ReorderButton lines={lines} /></> : <p className="shop-lede">{en ? 'This selection link is incomplete. Browse the current catalog to choose your products.' : 'Liên kết chưa có danh sách sản phẩm hợp lệ. Bạn có thể chọn lại trong danh mục hiện tại.'}</p>}
    <Link href="/products" className="shop-btn shop-btn-secondary">{en ? 'Browse products' : 'Xem sản phẩm'}</Link>
  </div></main><ShopFooter /></div>;
}
