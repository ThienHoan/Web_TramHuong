'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Leaf, Pause, Phone, Play, Truck } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { SHOP_CONTACT } from '@/lib/legal';

export default function TopBar() {
  const en = useLocale() !== 'vi';
  const [paused, setPaused] = useState(false);
  const brand = en ? 'Thien Phuc · Vietnamese agarwood, everyday peace' : 'Thiên Phúc · Hương Việt, nếp an yên';
  const advice = en ? 'Choose agarwood with Thien Phuc' : 'Cùng Thiên Phúc chọn phẩm trầm phù hợp';
  const shipping = en ? 'Delivery & payment' : 'Giao hàng & thanh toán';

  return (
    <section
      className="tp-announcement shop-announcement"
      aria-label={en ? 'Updates from Thien Phuc' : 'Thông tin từ Thiên Phúc'}
      data-paused={paused}
    >
      <div className="shop-announcement-viewport">
        <div className="shop-announcement-track">
          {[false, true].map(copy => (
            <div className="shop-announcement-group" key={String(copy)} aria-hidden={copy || undefined} inert={copy || undefined}>
              <span className="shop-announcement-item"><Leaf size={14} aria-hidden="true" />{brand}</span>
              <span className="shop-announcement-separator" aria-hidden="true">✦</span>
              <a className="shop-announcement-item" href={`tel:${SHOP_CONTACT.phone}`}><Phone size={14} aria-hidden="true" />Hotline: 0356.176.878</a>
              <span className="shop-announcement-separator" aria-hidden="true">✦</span>
              <Link className="shop-announcement-item" href="/contact">{advice}</Link>
              <span className="shop-announcement-separator" aria-hidden="true">✦</span>
              <Link className="shop-announcement-item" href="/policies/shipping"><Truck size={14} aria-hidden="true" />{shipping}</Link>
              <span className="shop-announcement-separator" aria-hidden="true">✦</span>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="shop-announcement-toggle"
        onClick={() => setPaused(value => !value)}
        aria-pressed={paused}
        aria-label={paused ? (en ? 'Resume announcements' : 'Tiếp tục dòng thông báo') : (en ? 'Pause announcements' : 'Tạm dừng dòng thông báo')}
      >
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      </button>
    </section>
  );
}
