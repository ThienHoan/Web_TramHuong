'use client';
import { useLocale } from 'next-intl';
import { useCurrency } from '@/hooks/useCurrency';
import { useShippingPolicy } from '@/hooks/useShippingAvailability';

export default function FreeShippingProgress({ subtotal, compact = false, active = true }: { subtotal?: number; compact?: boolean; active?: boolean }) {
  const { data } = useShippingPolicy(active);
  const en = useLocale() === 'en';
  const { formatPrice } = useCurrency();
  if (!data || data.checkoutEnabled) return null;
  const threshold = data.flatRate.freeFrom;
  if (compact || subtotal === undefined) return <p className="shipping-progress-note">{en ? `Free delivery from ${formatPrice(threshold)}` : `Miễn phí giao từ ${formatPrice(threshold)}`}</p>;
  const remaining = Math.max(0, threshold - subtotal);
  return <section className="shipping-progress" aria-label={en ? 'Free delivery' : 'Miễn phí giao hàng'}>
    <p aria-live="polite">{remaining ? (en ? `Add ${formatPrice(remaining)} more for free delivery` : `Thêm ${formatPrice(remaining)} nữa để được miễn phí giao`) : (en ? 'This order qualifies for free delivery' : 'Đơn này được miễn phí giao')}</p>
    <progress value={Math.max(0, Math.min(subtotal, threshold))} max={threshold} aria-label={en ? 'Progress toward free delivery' : 'Tiến độ miễn phí giao hàng'} />
  </section>;
}
