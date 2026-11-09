"use client";

import Image from "next/image";
import { ArrowUpRight, PackageCheck, MessageCircle } from "lucide-react";
import { AgarwoodIcon } from "@/components/icons/BrandIcons";
import { Link } from "@/i18n/routing";
import TraditionalHeader from "./TraditionalHeader";
import TraditionalFooter from "./TraditionalFooter";
import ScrollReveal from "@/components/ui/ScrollReveal";
import HomeHero from "./home/HomeHero";
import HomeStory from "./home/HomeStory";
import HomeCollections from "./home/HomeCollections";
import HomeJourney from "./home/HomeJourney";
import dynamic from "next/dynamic";
import { experienceShoppingLinks } from "@/lib/experience-shopping";
import ShopDiscovery from "@/components/shop/ShopDiscovery";
import LandingTextMotion from "./home/LandingTextMotion";

import type { Category, Product } from "@/types/product";
import type { BlogPost } from "@/types/blog";

const AgarwoodExperience = dynamic(
  () => import("@/components/experience-lab/ExperienceLab"),
);

export default function TraditionalHome({
  products,
  posts = [],
  categories = [],
}: {
  products: Product[];
  categories?: Category[];
  posts?: BlogPost[];
}) {
  const shoppingLinks = experienceShoppingLinks(categories);
  return (
    <div className="atelier-page tp-home">
      <LandingTextMotion />
      <TraditionalHeader />
      <main>
        <HomeHero />
        <div className="tp-values">
          <div className="tp-container">
            <span>
              <AgarwoodIcon size={19} /> Trân trọng nguồn hương Việt
            </span>
            <span>
              <PackageCheck size={19} /> Chăm chút từng phẩm vật
            </span>
            <span>
              <MessageCircle size={19} /> Tư vấn từ sự thấu hiểu
            </span>
          </div>
        </div>
        <ShopDiscovery products={products} categories={categories} />
        <HomeCollections products={products} categories={categories} />
        <HomeJourney shoppingLinks={shoppingLinks} />
        <HomeStory />
        <AgarwoodExperience embedded initialMode="ritual" shoppingLinks={shoppingLinks} />
        <section className="tp-ritual" aria-labelledby="ritual-heading">
          <div className="tp-ritual-image">
            <Image
              src="/photos/ritual.webp"
              alt="Khay nụ trầm và tách trà trong một nghi thức thưởng trầm"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
            />
          </div>
          <div className="tp-ritual-copy">
            <ScrollReveal>
              <p className="tp-eyebrow">MỘT NGHI THỨC NHỎ MỖI NGÀY</p>
              <h2 id="ritual-heading">
                Không cần đi xa.
                <br />
                Bình an ở <em>ngay đây.</em>
              </h2>
              <p>
                Thắp một nụ trầm. Pha một ấm trà. Để hương thơm dịu dàng lấp đầy
                góc nhà, và dành một khoảng thảnh thơi cho chính mình.
              </p>
              <Link href="/products" className="tp-button">
                Tìm hương cho không gian <ArrowUpRight size={18} />
              </Link>
            </ScrollReveal>
          </div>
        </section>
        <section
          className="tp-journal tp-section"
          aria-labelledby="journal-heading"
        >
          <div className="tp-container">
            <div className="tp-section-heading">
              <div>
                <p className="tp-eyebrow">CHUYỆN HƯƠNG, CHUYỆN ĐỜI</p>
                <h2 id="journal-heading">
                  Đọc chậm.
                  <br />
                  <em>Cảm nhận sâu.</em>
                </h2>
              </div>
              <Link href="/blog" className="tp-text-link">
                Thư viện hương trầm <ArrowUpRight size={18} />
              </Link>
            </div>
            {posts.length ? (
              <div className="tp-journal-grid">
                {posts.slice(0, 3).map((post) => (
                  <article key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="tp-journal-card"
                    >
                      <div className="tp-journal-image">
                        <Image
                          src={post.cover_image || "/photos/journal.webp"}
                          alt={post.title}
                          fill
                          sizes="(max-width: 767px) 90vw, 30vw"
                        />
                      </div>
                      <p className="tp-eyebrow">
                        {post.category || "KIẾN THỨC TRẦM HƯƠNG"}
                      </p>
                      <h3>{post.title}</h3>
                      <span className="tp-text-link">
                        Đọc câu chuyện <ArrowUpRight size={16} />
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="tp-journal-intro">
                <p>
                  Từ cách chọn trầm đến nghệ thuật thưởng hương. Những câu
                  chuyện giúp bạn hiểu hơn về phẩm vật mình yêu thích.
                </p>
                <Link href="/blog" className="tp-text-link">
                  Ghé thăm thư viện <ArrowUpRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>
        <section className="tp-contact-band">
          <div className="tp-container">
            <div>
              <p className="tp-eyebrow">THIÊN PHÚC LUÔN LẮNG NGHE</p>
              <h2>Làn hương nào dành cho bạn?</h2>
            </div>
            <Link href="/contact" className="tp-button">
              Cùng tìm hương phù hợp <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <TraditionalFooter />
    </div>
  );
}
