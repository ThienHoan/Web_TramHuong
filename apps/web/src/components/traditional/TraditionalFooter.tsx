"use client";

import { Link } from "@/i18n/routing";
import { ArrowUpRight, Phone, Mail } from "lucide-react";
import { BrandLockup, BRAND } from "@/components/brand/BrandIdentity";

import { LegalLinks } from "@/components/legal/LegalLinks";

export default function TraditionalFooter() {
  return (
    <footer className="atelier-footer mt-auto">
      <div className="atelier-footer-inner">
        <div className="atelier-footer-heading">
          <div>
            <span className="atelier-footer-eyebrow">
              THIÊN PHÚC · TRẦM HƯƠNG VIỆT
            </span>
            <h2>{BRAND.signature}</h2>
          </div>
          <Link href="/contact">
            Cùng tìm hương phù hợp <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="atelier-footer-columns">
          <div>
            <Link href="/" className="atelier-footer-brand">
              <BrandLockup inverse />
            </Link>
            <p>
              Từ trầm hương Việt đến những nghi thức nhỏ mỗi ngày. Chúng tôi
              trân trọng từng phẩm vật bạn mang về nhà.
            </p>
          </div>
          <div>
            <h3>Ghé thăm Thiên Phúc</h3>
            <ul>
              <li>153 Lý Thái Tổ, Hương Trà, Thành phố Huế</li>
              <li>08:00 – 21:00, mỗi ngày</li>
              <li>
                <a href="tel:0356176878">
                  <Phone size={15} />
                  0356.176.878
                </a>
              </li>
              <li>
                <a href="mailto:Hoan64735@gmail.com">
                  <Mail size={15} />
                  Hoan64735@gmail.com
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3>Tiếp tục khám phá</h3>
            <ul>
              <li>
                <Link href="/products">Bộ sưu tập trầm hương</Link>
              </li>
              <li>
                <Link href="/blog">Chuyện hương trầm</Link>
              </li>
              <li>
                <Link href="/order-lookup">Tra cứu đơn hàng</Link>
              </li>
              <li>
                <Link href="/partnership">Đồng hành & hợp tác</Link>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/profile.php?id=61585286954215"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook <ArrowUpRight size={14} />
                </a>
              </li>
            </ul>
          </div>
        </div>
        <LegalLinks />
        <div className="brand-footer-signature" aria-hidden="true">
          <span>Thiên Phúc.</span>
          <span>
            HƯƠNG VIỆT
            <br />
            NẾP AN YÊN.
          </span>
        </div>
        <div className="atelier-footer-bottom">
          <span>
            © {new Date().getFullYear()} THIÊN PHÚC · TRẦM HƯƠNG VIỆT
          </span>
          <span>HUẾ, VIỆT NAM</span>
        </div>
      </div>
    </footer>
  );
}
