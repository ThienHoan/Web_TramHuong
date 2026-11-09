"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Category, Product } from "@/types/product";
import { IncenseConeIcon } from "@/components/icons/BrandIcons";
import { allProductsHref } from "@/lib/catalog";

export default function HomeCollections({ products, categories: catalogCategories = [] }: { products: Product[]; categories?: Category[] }) {
  const [ref, api] = useEmblaCarousel({
    align: "start",
    loop: false,
    dragFree: true,
    containScroll: "trimSnaps",
  });
  const derivedCategories = Array.from(
    new Map(
      products
        .filter((p) => p.category && p.category.is_active !== false)
        .map((p) => [
          p.category!.id,
          { ...p.category!, image: p.category!.image || p.images?.[0] },
        ]),
    ).values(),
  ).slice(0, 6);
  const categories = (catalogCategories.length ? catalogCategories.filter(c => c.is_active !== false) : derivedCategories).slice(0, 6);
  const collections = categories.length
    ? categories.map((c) => ({
        title:
          c.translation?.name ||
          c.translations?.find((t) => t.locale === "vi")?.name ||
          c.slug,
        image: c.image || "/editorial/ritual.webp",
        href: `/products/category/${c.slug}`,
      }))
    : [
        {
          title: "Một góc tĩnh lặng",
          image: "/editorial/forest.webp",
          href: "/products",
        },
        {
          title: "Nghi thức thưởng hương",
          image: "/editorial/ritual.webp",
          href: "/products",
        },
        {
          title: "Hương cho không gian",
          image: "/editorial/wood.webp",
          href: "/products",
        },
      ];
  return (
    <section
      id="bo-suu-tap"
      className="tp-collections tp-section"
      aria-labelledby="collections-heading"
    >
      <div className="tp-container">
        <div className="tp-section-heading">
          <div>
            <p className="tp-eyebrow">
              <IncenseConeIcon size={18} /> TÌM MỘT LÀN HƯƠNG CHO RIÊNG MÌNH
            </p>
            <h2 id="collections-heading">
              Mỗi lựa chọn,
              <br />
              một <em>cách an yên.</em>
            </h2>
          </div>
          <div className="tp-gallery-controls">
            <button
              className="tp-icon-button"
              onClick={() => api?.scrollPrev()}
              aria-label="Bộ sưu tập trước"
            >
              <ArrowLeft size={19} />
            </button>
            <button
              className="tp-icon-button"
              onClick={() => api?.scrollNext()}
              aria-label="Bộ sưu tập tiếp theo"
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </div>
        <div
          className="tp-gallery"
          ref={ref}
          role="region"
          aria-roledescription="băng chuyền"
          aria-label="Bộ sưu tập trầm hương"
        >
          <div className="tp-gallery-track">
            {collections.map((collection, i) => (
              <div className="tp-collection-slide" key={collection.title}>
                <Link href={collection.href} className="tp-collection-card">
                  <div className="tp-collection-image">
                    <Image
                      src={collection.image}
                      alt={collection.title}
                      fill
                      sizes="(max-width: 767px) 80vw, 35vw"
                    />
                    <span className="tp-collection-number">0{i + 1}</span>
                  </div>
                  <div className="tp-collection-caption">
                    <h3>{collection.title}</h3>
                    <span className="tp-icon-button">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="tp-gallery-footer">
          <span>KÉO ĐỂ KHÁM PHÁ</span>
          <Link href={allProductsHref("vi")} className="tp-text-link">
            Tất cả sản phẩm <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
