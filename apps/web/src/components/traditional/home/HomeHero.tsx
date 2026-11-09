"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { BrandSeal } from "@/components/brand/BrandIdentity";
import { IncenseBurnerIcon } from "@/components/icons/BrandIcons";
import { Link } from "@/i18n/routing";

export default function HomeHero({ locale = "vi" }: { locale?: "vi" | "en" }) {
  const en = locale === "en";
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const noteY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 35]);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(pointerX, { stiffness: 90, damping: 22 });
  const rotateX = useSpring(pointerY, { stiffness: 90, damping: 22 });
  return (
    <section ref={ref} className="tp-hero" aria-labelledby="home-heading">
      <div className="tp-hero-grid" aria-hidden="true" />
      <div className="tp-container tp-hero-layout">
        <motion.div
          className="tp-hero-copy tp-depth"
          style={{ y: reduce ? 0 : titleY }}
        >
          <p className="tp-eyebrow">
            <span />{" "}
            {en
              ? "ROOTED IN NATURE · MADE FOR STILLNESS"
              : "THIÊN PHÚC · TRẦM HƯƠNG VIỆT"}
          </p>
          <h1 id="home-heading">
            {en ? (
              <>
                A little incense.
                <br />A moment of <em>peace.</em>
              </>
            ) : (
              <>
                Một làn hương.
                <br />
                Một khoảng <em>an yên.</em>
              </>
            )}
          </h1>
          <p className="tp-hero-description">
            {en
              ? "Explore Vietnamese agarwood at Thien Phuc. See product photos, prices and options, and ask us to help you choose."
              : "Khám phá trầm hương Việt tại Thiên Phúc. Xem hình ảnh, giá bán và phân loại; cùng chọn phẩm trầm phù hợp với bạn."}
          </p>
          <div className="tp-hero-actions">
            <Link href="/products" className="tp-button">
              {en ? "Shop agarwood" : "Chọn sản phẩm trầm hương"}{" "}
              <ArrowUpRight size={18} />
            </Link>
            <a href={en ? "#chon-san-pham" : "#hanh-trinh-huong"} className="tp-text-link">
              {en ? "Browse products & prices" : "Khám phá trầm qua trải nghiệm"}{" "}
              <ArrowDown size={16} />
            </a>
          </div>
          <p className="brand-provenance">{en ? "THIÊN PHÚC · HUẾ, VIETNAM" : "HƯƠNG VIỆT. NẾP AN YÊN. · THIÊN PHÚC, HUẾ"}</p>
          <div className="tp-hero-footnote">
            <span className="tp-small-seal">
              <IncenseBurnerIcon size={19} />
            </span>
            <p>
              {en ? "Slow down a little." : "Chậm một nhịp."}
              <br />
              <strong>
                {en ? "Feel a little more." : "Để cảm nhận nhiều hơn."}
              </strong>
            </p>
          </div>
        </motion.div>
        <div
          className="tp-hero-visual"
          onPointerMove={(event) => {
            if (reduce || event.pointerType !== "mouse") return;
            const bounds = event.currentTarget.getBoundingClientRect();
            pointerX.set(
              ((event.clientX - bounds.left) / bounds.width - 0.5) * 6,
            );
            pointerY.set(
              -((event.clientY - bounds.top) / bounds.height - 0.5) * 4,
            );
          }}
          onPointerLeave={() => {
            pointerX.set(0);
            pointerY.set(0);
          }}
        >
          <BrandSeal className="brand-hero-seal" />
          <div className="tp-orbit tp-orbit-one" aria-hidden="true" />
          <div className="tp-orbit tp-orbit-two" aria-hidden="true" />
          <span className="tp-vertical-label" aria-hidden="true">
            THIÊN PHÚC — AGARWOOD ATELIER
          </span>
          <motion.div
            className="tp-hero-photo tp-depth"
            style={{
              y: reduce ? 0 : photoY,
              rotateX: reduce ? 0 : rotateX,
              rotateY: reduce ? 0 : rotateY,
            }}
          >
            <Image
              src="/photos/hero.webp"
              alt={
                en
                  ? "Thien Phuc incense cone tins on a wooden tray"
                  : "Các hộp nụ trầm Thiên Phúc bày trên khay gỗ"
              }
              fill
              priority
              sizes="(max-width: 767px) 90vw, 48vw"
              quality={85}
            />
            <span className="tp-photo-caption">
              {en ? "The art of being still" : "Nghệ thuật của sự tĩnh lặng"}
            </span>
          </motion.div>
          <motion.div
            className="tp-hero-note tp-depth"
            style={{ y: reduce ? 0 : noteY }}
          >
            <span className="tp-note-mark">
              <IncenseBurnerIcon size={28} />
            </span>
            <span>
              {en ? "Fragrance from nature." : "Hương từ thiên nhiên."}
              <br />
              <strong>
                {en ? "Stillness from within." : "An yên từ bên trong."}
              </strong>
            </span>
          </motion.div>
          <span className="tp-hero-index" aria-hidden="true">
            01 / {en ? "VIETNAMESE AGARWOOD" : "HƯƠNG TRẦM VIỆT"}
          </span>
        </div>
      </div>
      <div className="tp-container tp-hero-bottom">
        <span>{en ? "THIEN PHUC AGARWOOD" : "TRẦM HƯƠNG THIÊN PHÚC"}</span>
        <a href="#chon-san-pham">
          {en ? "Scroll to discover" : "Cuộn để khám phá"}{" "}
          <ArrowDown size={14} />
        </a>
        <span>HUẾ, VIỆT NAM</span>
      </div>
    </section>
  );
}
