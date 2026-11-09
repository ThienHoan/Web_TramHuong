"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, Leaf, Search } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Category, Product } from "@/types/product";
import TraditionalHeader from "./TraditionalHeader";
import TraditionalFooter from "./TraditionalFooter";
import ShopCatalogFilters, { ShopCategoryLinks } from "@/components/shop/ShopCatalogFilters";
import ShopProductCard from "@/components/shop/ShopProductCard";
import { collectionChapters } from "@/lib/collections";
import { allProductsHref, parseCatalogFilters } from "@/lib/catalog";
import { experienceShoppingLinks } from "@/lib/experience-shopping";
import { formatVnd, priceRange } from "@/lib/commerce";
import "./collections.css";
import "@/components/shop/shop.css";

const chapters = [
  { id: "chuong-1", number: "I", label: "Thượng Hạng", note: "Chậm ngắm chất trầm.", image: "/photos/chapter-premium.webp" },
  { id: "chuong-2", number: "II", label: "An Yên", note: "Nghi thức cho góc nhà.", image: "/photos/chapter-calm.webp" },
  { id: "chuong-3", number: "III", label: "Tâm Giao", note: "Món quà gửi người thương.", image: "/photos/chapter-gift.webp" },
];
const allProducts = allProductsHref("vi");
const filters = parseCatalogFilters({ sort: "newest" });

export default function TraditionalProductList({ products, categories = [] }: {
  products: Product[];
  categories?: Category[];
}) {
  const [activeSection, setActiveSection] = useState("chuong-1");
  const grouped = collectionChapters(products);
  const shoppingLinks = experienceShoppingLinks(categories);
  const gift = grouped.chapter_3[0];
  const giftTitle = gift?.translation?.title || gift?.title || "";
  const giftPrice = gift ? priceRange(gift) : null;

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      }
    }, { rootMargin: "-150px 0px -45% 0px", threshold: 0 });
    for (const chapter of chapters) {
      const section = document.getElementById(chapter.id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  return <div className="atelier-page shop-commerce collection-page">
    <TraditionalHeader />
    <main>
      <div className="tp-container">
        <nav aria-label="Đường dẫn" className="shop-breadcrumb"><Link href="/">Trang chủ</Link><span>/</span><span>Bộ sưu tập</span></nav>
        <header className="collection-intro">
          <div><p className="shop-kicker">PHẨM VẬT TỪ THIÊN NHIÊN</p><h1>Chọn một làn hương.<br /><em>Giữ một khoảng yên.</em></h1></div>
          <div className="collection-intro-copy"><p>Vòng trầm để mang theo, hương trầm cho góc nhà, hay một món quà gửi người thương. Chậm rãi khám phá từng bộ sưu tập theo cách của bạn.</p><Link href={allProducts} className="tp-text-link">Xem toàn bộ sản phẩm <ArrowUpRight size={17} /></Link></div>
        </header>
        <nav className="collection-gateway" aria-label="Khám phá theo chương">
          {chapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`} className="collection-gateway-tile" onClick={() => setActiveSection(chapter.id)}>
            <Image src={chapter.image} alt="" fill sizes="(max-width: 767px) 74vw, 31vw" />
            <span className="collection-gateway-copy"><span>CHƯƠNG {chapter.number}</span><strong>{chapter.label}</strong><span>{chapter.note}</span></span>
            <ArrowDown size={16} aria-hidden="true" />
          </a>)}
        </nav>
        <details className="collection-search" id="tim-san-pham">
          <summary><span><Search size={17} aria-hidden="true" /><strong>Tìm & lọc sản phẩm</strong><span>Theo tên, loại trầm hoặc ngân sách</span></span><ChevronDown size={18} aria-hidden="true" /></summary>
          <div><nav className="shop-category-links" aria-label="Danh mục sản phẩm"><ShopCategoryLinks categories={categories} filters={filters} locale="vi" /></nav><ShopCatalogFilters filters={filters} locale="vi" /></div>
        </details>
      </div>

      <nav className="collection-chapter-nav" aria-label="Các chương của bộ sưu tập">
        <div className="tp-container">
          {chapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`} aria-current={activeSection === chapter.id ? "location" : undefined} onClick={() => setActiveSection(chapter.id)}><span>{chapter.number}</span>{chapter.label}</a>)}
        </div>
      </nav>

      <section className="collection-chapter" id="chuong-1" aria-labelledby="chapter-one-title">
        <div className="tp-container collection-split">
          <div className="collection-chapter-copy">
            <p className="shop-kicker">CHƯƠNG I · THƯỢNG HẠNG</p>
            <h2 id="chapter-one-title">Chậm ngắm<br /><em>chất trầm.</em></h2>
            <p>Một sắc gỗ, một đường vân, một cách thưởng hương. Mỗi phẩm vật gợi mở một góc nhìn riêng về thế giới trầm hương.</p>
            <p>Hãy bắt đầu từ hình ảnh, chất liệu và thông số của từng sản phẩm. Thiên Phúc sẵn lòng cùng bạn tìm hiểu trước khi lựa chọn.</p>
            <Link href={allProducts} className="tp-text-link">Khám phá phẩm trầm <ArrowUpRight size={17} /></Link>
            <div className="collection-chapter-note"><Leaf size={18} aria-hidden="true" /><p>Chọn từ sự thấu hiểu.<br /><span>Xem kỹ phẩm vật, rồi tìm hương hợp với mình.</span></p></div>
          </div>
          {grouped.chapter_1.length ? <div className="collection-product-pair">{grouped.chapter_1.slice(0, 4).map(product => <ShopProductCard key={product.id} product={product} />)}</div> : <figure className="collection-mood"><Image src="/photos/story-wood.webp" alt="Que trầm và mảnh gỗ trầm trên mặt gỗ" fill sizes="(max-width: 767px) 92vw, 50vw" /><figcaption>Đôi nét vân gỗ. Một vẻ riêng.</figcaption></figure>}
        </div>
      </section>

      <div className="collection-pause">
        <Image src="/photos/banner-nature.webp" alt="" fill sizes="100vw" />
        <p>Một làn hương.<br /><em>Một nhịp sống chậm.</em></p>
      </div>

      <section className="collection-chapter collection-ritual" id="chuong-2" aria-labelledby="chapter-two-title">
        <div className="tp-container">
          <header className="collection-centered-heading"><p className="shop-kicker">CHƯƠNG II · AN YÊN</p><h2 id="chapter-two-title">Nghi thức <em>an yên.</em></h2><p>Một lư trầm, một góc nhà, một chút thời gian cho riêng mình. Tìm phẩm trầm phù hợp với những nghi thức nhỏ mỗi ngày.</p></header>
          <div className="collection-ritual-layout">
            <article className="collection-ritual-story">
              <div><Leaf size={24} aria-hidden="true" /><h3>Mang hương về góc nhà.</h3><p>Chọn kiểu hương bạn muốn thưởng, tìm dụng cụ phù hợp và đọc hướng dẫn trước khi dùng. Một nghi thức giản đơn bắt đầu từ những lựa chọn vừa vặn.</p><Link href={shoppingLinks.ritual} className="tp-text-link">Tìm hương cho không gian <ArrowUpRight size={17} /></Link></div>
              <div className="collection-ritual-photo"><Image src="/photos/ritual-corner.webp" alt="Khay nụ trầm và ấm xông trong một góc thưởng trầm" fill sizes="(max-width: 767px) 92vw, 40vw" /></div>
            </article>
            {grouped.chapter_2.length ? <div className="collection-product-pair">{grouped.chapter_2.slice(0, 6).map(product => <ShopProductCard key={product.id} product={product} />)}</div> : <div className="collection-ritual-empty"><p className="shop-kicker">CÙNG CHỌN MỘT LÀN HƯƠNG</p><h3>Bắt đầu từ cách bạn muốn thưởng trầm.</h3><p>Khám phá nhang, nụ xông và phụ kiện trong danh mục, hoặc hỏi Thiên Phúc để cùng lựa chọn.</p><Link href={shoppingLinks.ritual} className="tp-text-link">Xem danh mục thưởng hương <ArrowUpRight size={17} /></Link></div>}
          </div>
        </div>
      </section>

      <section className="collection-chapter collection-gifts" id="chuong-3" aria-labelledby="chapter-three-title">
        <div className="tp-container">
          <header className="collection-gift-heading"><div><p className="shop-kicker">CHƯƠNG III · TÂM GIAO</p><h2 id="chapter-three-title">Tâm giao <em>gửi trao.</em></h2></div><p>Một món quà được chọn bằng sự quan tâm.<br />Một làn hương thay lời muốn nói.</p></header>
          <div className="collection-gift-hero">
            <div className={`collection-gift-photo ${gift ? "collection-gift-photo-product" : ""}`}><Image src={gift?.images?.[0] || "/photos/category-qua-tang.webp"} alt={gift ? giftTitle : "Các hộp nụ trầm Thiên Phúc"} fill sizes="(max-width: 767px) 92vw, 50vw" /></div>
            <div className="collection-gift-copy"><p className="shop-kicker">MỘT MÓN QUÀ CÓ Ý NGHĨA</p><h3>{giftTitle || "Gửi hương, gửi một lời quan tâm."}</h3><p>{gift?.translation?.short_description || "Dành tặng người thân, một người bạn hay người đã đồng hành cùng bạn. Cùng Thiên Phúc chọn phẩm trầm, cách dùng và hình thức quà phù hợp với người nhận."}</p>{giftPrice && <p className="collection-gift-price">{giftPrice.max > giftPrice.min ? "Từ " : ""}{formatVnd(giftPrice.min, "vi")}</p>}<Link href={gift ? `/products/${gift.slug}` : shoppingLinks.gift} className="shop-btn">{gift ? "Khám phá bộ quà" : "Cùng chọn món quà"}<ArrowUpRight size={17} /></Link></div>
          </div>
          {grouped.chapter_3.length > 1 && <div className="collection-gift-products">{grouped.chapter_3.slice(1, 4).map(product => <ShopProductCard key={product.id} product={product} />)}</div>}
        </div>
      </section>

      <aside className="collection-closing tp-container"><p className="shop-kicker">TIẾP TỤC THEO CÁCH CỦA BẠN</p><h2>Đã tìm được<br /><em>làn hương của mình?</em></h2><div><Link href={allProducts} className="shop-btn">Xem toàn bộ sản phẩm <ArrowRight size={17} /></Link><Link href="/contact" className="tp-text-link">Nhờ Thiên Phúc tư vấn <ArrowUpRight size={17} /></Link></div><Link href="/blog" className="tp-text-link collection-journal-link">Đọc thêm Chuyện hương trầm <ArrowUpRight size={15} /></Link></aside>
    </main>
    <TraditionalFooter />
  </div>;
}
