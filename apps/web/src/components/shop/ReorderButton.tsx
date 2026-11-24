'use client';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { getProductsPaginated } from '@/lib/api-client';
import { useCart } from '@/components/providers/CartProvider';
import { Link } from '@/i18n/routing';
import { variantKey } from '@/lib/commerce';
import { resolveReorderLine, type ReorderLine } from '@/lib/reorder';
import type { Product } from '@/types/product';

export default function ReorderButton({ lines }: { lines: ReorderLine[] }) {
  const locale = useLocale(), en = locale === 'en';
  const { items, addItem } = useCart();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [added, setAdded] = useState(false);
  const reorder = async () => {
    if (busy) return;
    setBusy(true); setAdded(false); setMessage('');
    let count = 0, skipped = 0, limited = 0;
    try {
      const wanted = new Set(lines.map(line => line.productId || line.product_id || line.id).filter(Boolean));
      const products = new Map<string, Product>();
      for (let page = 1; ; page++) {
        const response = await getProductsPaginated(locale, { limit: 100, page });
        for (const product of response.data) if (wanted.has(product.id)) products.set(product.id, product);
        if (products.size === wanted.size || !response.data.length || page >= (response.meta?.last_page || 1)) break;
      }
      const reserved = new Map<string, number>();
      for (const item of items) {
        const current = products.get(item.id);
        const index = current?.variants?.findIndex((v, i) => [v.id, v.sku, v.name, variantKey(v, i)].some(value => value && (value === item.variantId || value === item.variantName))) ?? -1;
        const variant = index >= 0 ? variantKey(current!.variants![index], index) : item.variantId || '';
        const key = `${item.id}:${variant}`;
        reserved.set(key, (reserved.get(key) || 0) + item.quantity);
      }
      for (const line of lines) {
        const id = line.productId || line.product_id || line.id;
        const product = id ? products.get(id) : undefined;
        const candidate = product ? resolveReorderLine(line, product) : null;
        if (!candidate) { skipped++; continue; }
        const key = `${candidate.id}:${candidate.variantId || ''}`;
        const next = resolveReorderLine(line, product!, reserved.get(key) || 0);
        if (!next) { skipped++; continue; }
        if (next.quantity < line.quantity) limited++;
        await addItem(next);
        reserved.set(key, (reserved.get(key) || 0) + next.quantity);
        count++;
      }
      setAdded(count > 0);
      setMessage(en ? `${count} items added at current prices. ${skipped} unavailable items skipped; ${limited} quantities limited by stock.` : `Đã thêm ${count} món theo giá hiện tại. Bỏ qua ${skipped} món không còn bán; ${limited} món giảm số lượng theo tồn kho.`);
    } catch {
      setAdded(count > 0);
      setMessage(en ? 'Some items could not be added. Check your cart before retrying.' : 'Chưa thêm được đầy đủ sản phẩm. Kiểm tra giỏ hàng trước khi thử lại.');
    } finally { setBusy(false); }
  };
  return <div className="my-4 space-y-3">
    <button type="button" className="shop-btn" disabled={busy || !lines.length} onClick={reorder}>{busy ? (en ? 'Checking availability…' : 'Đang kiểm tra hàng…') : (en ? 'Buy this order again' : 'Mua lại đơn này')}</button>
    {message && <p role="status" className="text-sm leading-relaxed">{message}</p>}
    {added && <Link href="/checkout" className="underline min-h-11 inline-flex items-center">{en ? 'Review cart and checkout' : 'Kiểm tra giỏ và thanh toán'}</Link>}
  </div>;
}
