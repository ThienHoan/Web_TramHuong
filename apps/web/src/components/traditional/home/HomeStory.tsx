"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";

const chapters = [
  {
    number: "01",
    title: "Từ một vết thương",
    text: "Trong thân cây dó bầu, nhựa cây dần tích tụ quanh những tổn thương. Đó là khởi đầu của hành trình tạo trầm.",
    image: "/editorial/wood.webp",
    alt: "Làn hương mảnh bên bề mặt gỗ mộc",
  },
  {
    number: "02",
    title: "Thời gian kết hương",
    text: "Qua thời gian, phần gỗ thấm nhựa mang một sắc hương riêng. Trầm kể câu chuyện của đất, của cây và sự chờ đợi.",
    image: "/editorial/forest.webp",
    alt: "Nụ trầm và làn khói trên lư đồng",
  },
  {
    number: "03",
    title: "Chạm đến an yên",
    text: "Từ rừng cây đến một góc nhỏ trong nhà. Một làn hương, một nghi thức giản đơn để trở về với hiện tại.",
    image: "/editorial/ritual.webp",
    alt: "Lư gốm mộc trong không gian thưởng trầm",
  },
];

function StoryImage({
  image,
  alt,
  index,
  progress,
  reduce,
}: {
  image: string;
  alt: string;
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduce: boolean | null;
}) {
  const opacity = useTransform(
    progress,
    [0, 0.28, 0.38, 0.61, 0.71, 1],
    index === 0
      ? [1, 1, 0, 0, 0, 0]
      : index === 1
        ? [0, 0, 1, 1, 0, 0]
        : [0, 0, 0, 0, 1, 1],
  );
  const scale = useTransform(progress, [0, 1], [1, 1.08]);
  return (
    <motion.div
      className="tp-story-frame"
      style={{
        opacity: reduce ? (index === 0 ? 1 : 0) : opacity,
        scale: reduce ? 1 : scale,
      }}
    >
      <Image src={image} alt={alt} fill sizes="(max-width: 767px) 90vw, 45vw" />
    </motion.div>
  );
}

export default function HomeStory() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  return (
    <section
      id="cau-chuyen"
      className="tp-story"
      ref={ref}
      aria-labelledby="story-heading"
    >
      <div className="tp-container">
        <div className="tp-section-heading">
          <div>
            <p className="tp-eyebrow">NGUỒN CỘI CỦA MÙI HƯƠNG</p>
            <h2 id="story-heading">
              Có những giá trị,
              <br />
              chỉ <em>thời gian</em> mới tạo nên.
            </h2>
          </div>
          <p>
            Không vội vàng. Không phô trương.
            <br />
            Trầm hương là lời nhắc về những điều bền lâu.
          </p>
        </div>
        <div className="tp-story-layout">
          <div className="tp-story-visual" aria-hidden="true">
            {chapters.map((chapter, index) => (
              <StoryImage
                key={chapter.number}
                {...chapter}
                index={index}
                progress={scrollYProgress}
                reduce={reduce}
              />
            ))}
            <span className="tp-story-image-label">
              DÓ BẦU → KẾT TRẦM → THƯỞNG HƯƠNG
            </span>
          </div>
          <div className="tp-story-chapters">
            {chapters.map((chapter) => (
              <article className="tp-story-chapter" key={chapter.number}>
                <div className="tp-story-mobile-image">
                  <Image
                    src={chapter.image}
                    alt={chapter.alt}
                    fill
                    sizes="90vw"
                  />
                </div>
                <span className="tp-chapter-number">{chapter.number} /</span>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
              </article>
            ))}
            <Link href="/blog" className="tp-text-link">
              Đọc thêm về thế giới trầm <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
