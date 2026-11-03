"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MoveHorizontal,
  Sun,
  RotateCcw,
  ZoomIn,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import type { PreviewController } from "@/components/experience-lab/types";
import { DEFAULT_OPTIONS } from "@/components/experience-lab/types";
import "./home-journey.css";

const worlds = [
  {
    title: "Mang hương theo mình.",
    tag: "VÒNG TRẦM",
    image: "/editorial/preview-bracelet.webp",
    text: "Sắc gỗ trầm lắng, từng nét vân riêng. Một phẩm vật nhỏ luôn ở bên bạn.",
    detail: "Chạm vào chất gỗ",
    href: "/products/catalog",
  },
  {
    title: "Dành hương cho nhà.",
    tag: "NGHI THỨC THƯỞNG TRẦM",
    image: "/editorial/ritual.webp",
    text: "Một lư trầm, một góc quen. Mời thiên nhiên vào khoảng nghỉ giữa ngày.",
    detail: "Tìm góc bình yên",
    href: "/products/catalog",
  },
  {
    title: "Gửi hương đến người.",
    tag: "MỘT MÓN QUÀ CÓ Ý NGHĨA",
    image: "/editorial/forest.webp",
    text: "Trao một làn hương, gửi một lời quan tâm. Chọn món quà cho người bạn thương.",
    detail: "Cùng chọn món quà",
    href: "/contact",
  },
];
const details = [
  {
    label: "Vân gỗ",
    title: "Từng nét vân, một vẻ riêng.",
    text: "Đặt vòng dưới ánh sáng để quan sát sắc nâu và đường vân. Hãy đối chiếu với ảnh thật khi chọn sản phẩm.",
    note: "Quan sát tổng thể",
    progress: 0.04,
  },
  {
    label: "Cấu trúc vòng",
    title: "Tách từng hạt, hiểu từng chi tiết.",
    text: "Các hạt mở ra để lộ cách sắp xếp và đường dây xuyên tâm. Bấm các điểm trên bàn để chuyển góc khám phá.",
    note: "Khám phá cấu trúc",
    progress: 0.4,
  },
  {
    label: "Dáng hạt",
    title: "Đến gần một hạt trầm.",
    text: "Góc nhìn gần làm rõ bề mặt và dáng hạt. Mô hình là minh họa; sắc gỗ và vân thực tế thay đổi theo từng phẩm vật.",
    note: "Góc nhìn cận cảnh",
    progress: 0.74,
  },
];
const tones = [
  { name: "Nâu tự nhiên", color: "#af8b55" },
  { name: "Gỗ sẫm", color: "#64503a" },
  { name: "Nâu mật", color: "#c0a274" },
];

export default function HomeJourney() {
  const root = useRef<HTMLDivElement>(null);
  const horizontal = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const sculpture = useRef<HTMLElement>(null);
  const sculptureStage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<PreviewController | null>(null);
  const progress = useRef(0);
  const galleryPosition = useRef(0);
  const drag = useRef<{ x: number; position: number } | null>(null);
  const didDrag = useRef(false);
  const [world, setWorld] = useState(0);
  const [detail, setDetail] = useState(0);
  const [ready, setReady] = useState(false);
  const [tone, setTone] = useState(0);
  const [light, setLight] = useState(0);
  const appearance = useRef({ tone: 0, light: 0 });

  useEffect(() => {
    appearance.current = { tone, light };
    controller.current?.update({
      ...DEFAULT_OPTIONS,
      tone,
      light,
      autoRotate: false,
      smoke: false,
    });
    controller.current?.setScrollProgress?.(progress.current);
  }, [tone, light]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    // Import only on the landing page, and revert all scroll work on navigation.
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();
        media.add(
          "(max-width: 899px), (prefers-reduced-motion: reduce)",
          () => {
            setWorld(0);
            track.current?.scrollTo({ left: 0, behavior: "instant" });
            root.current?.style.setProperty("--journey-progress", "0");
          },
        );
        media.add(
          "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
          () => {
            root.current?.classList.add("journey-enhanced");
            const cards = Array.from(
              track.current!.querySelectorAll<HTMLElement>(".journey-world"),
            );
            const playhead = { position: 0 };
            let cardWidth = 0;
            const measure = () => {
              cardWidth = cards[0]?.offsetWidth || 1;
            };
            const renderGallery = () => {
              galleryPosition.current = playhead.position;
              const selected = Math.max(
                0,
                Math.min(2, Math.round(playhead.position)),
              );
              setWorld(selected);
              root.current?.style.setProperty(
                "--journey-progress",
                String(playhead.position / 2),
              );
              cards.forEach((card, index) => {
                const distance = index - playhead.position;
                const depth = Math.min(Math.abs(distance), 2);
                const angle = Math.max(-1, Math.min(1, distance)) * -16;
                card.style.transform = `translate3d(calc(-50% + ${distance * (cardWidth * 0.91 + 28)}px), -50%, ${-depth * 170}px) rotateY(${angle}deg) scale(${1 - depth * 0.055})`;
                card.style.opacity = String(Math.max(0.2, 1 - depth * 0.42));
                card.style.zIndex = String(10 - Math.round(depth * 3));
                card.style.setProperty(
                  "--card-dim",
                  String(Math.min(0.38, depth * 0.26)),
                );
              });
            };
            measure();
            gsap.to(playhead, {
              position: 2,
              ease: "none",
              onUpdate: renderGallery,
              scrollTrigger: {
                trigger: horizontal.current,
                start: "top 80px",
                end: "bottom bottom",
                scrub: 0.75,
                invalidateOnRefresh: true,
                onRefresh: () => {
                  measure();
                  renderGallery();
                },
              },
            });
            renderGallery();
            const sculpturePlayhead = { position: 0 };
            gsap.to(sculpturePlayhead, {
              position: 1,
              ease: "none",
              scrollTrigger: {
                trigger: sculpture.current,
                start: "top 80px",
                end: () =>
                  `+=${Math.max(1, sculpture.current!.offsetHeight - sculptureStage.current!.offsetHeight)}`,
                scrub: 0.35,
              },
              onUpdate: () => {
                const p = sculpturePlayhead.position;
                progress.current = p;
                controller.current?.setScrollProgress?.(p);
                setDetail(p < 0.27 ? 0 : p < 0.53 ? 1 : 2);
                const exit = gsap.utils.clamp(0, 1, (p - 0.8) / 0.17);
                root.current?.style.setProperty(
                  "--sculpture-exit",
                  String(exit * exit * (3 - 2 * exit)),
                );
              },
            });
            return () => {
              root.current?.classList.remove("journey-enhanced");
              root.current?.style.removeProperty("--sculpture-exit");
              cards.forEach((card) => {
                card.style.removeProperty("transform");
                card.style.removeProperty("opacity");
                card.style.removeProperty("z-index");
                card.style.removeProperty("--card-dim");
              });
            };
          },
          root,
        );
        const resize = new ResizeObserver(() => ScrollTrigger.refresh());
        if (stage.current) resize.observe(stage.current);
        if (sculptureStage.current) resize.observe(sculptureStage.current);
        cleanup = () => {
          resize.disconnect();
          media.revert();
        };
        ScrollTrigger.refresh();
      })
      .catch(() => {
        /* Native horizontal scrolling remains available. */
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let started = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      controller.current?.dispose();
      controller.current = null;
      setReady(false);
      started = false;
    };
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || started || reduced.matches) return;
        started = true;
        try {
          const { createPreviewScene } = await import(
            "@/components/experience-lab/createPreviewScene"
          );
          if (disposed || reduced.matches || !canvas.current) return;
          controller.current = createPreviewScene(
            canvas.current,
            "bracelet",
            {
              ...DEFAULT_OPTIONS,
              ...appearance.current,
              smoke: false,
              autoRotate: false,
            },
            () => {},
            stop,
            "studio",
          );
          controller.current.setScrollProgress?.(progress.current);
          setReady(true);
        } catch {
          /* Keep the complete photo fallback when WebGL is unavailable. */
        }
      },
      { rootMargin: "180px" },
    );
    if (sculpture.current) observer.observe(sculpture.current);
    const motionChanged = () => {
      stop();
      if (!reduced.matches && sculpture.current) {
        observer.unobserve(sculpture.current);
        observer.observe(sculpture.current);
      }
    };
    reduced.addEventListener("change", motionChanged);
    return () => {
      disposed = true;
      observer.disconnect();
      reduced.removeEventListener("change", motionChanged);
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);

  const revealWorld = (index: number) => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (window.innerWidth >= 900 && !reduced && horizontal.current) {
      const top =
        horizontal.current.getBoundingClientRect().top + window.scrollY - 80;
      const travel =
        horizontal.current.offsetHeight - (window.innerHeight - 80);
      window.scrollTo({ top: top + travel * (index / 2), behavior: "smooth" });
    } else if (track.current) {
      setWorld(index);
      const card = track.current.children[index] as HTMLElement;
      track.current.scrollTo({
        left: card.offsetLeft - track.current.offsetLeft,
        behavior: reduced ? "auto" : "smooth",
      });
    }
  };

  const selectDetail = (index: number) => {
    const p = details[index].progress;
    progress.current = p;
    setDetail(index);
    controller.current?.setScrollProgress?.(p);
    if (
      root.current?.classList.contains("journey-enhanced") &&
      sculpture.current
    ) {
      const top =
        sculpture.current.getBoundingClientRect().top + window.scrollY - 80;
      const travel =
        sculpture.current.offsetHeight -
        (sculptureStage.current?.offsetHeight ?? window.innerHeight - 80);
      window.scrollTo({ top: top + travel * p, behavior: "smooth" });
    }
  };

  return (
    <div ref={root} className="journey-root">
      <section
        id="hanh-trinh-huong"
        ref={horizontal}
        className="journey-horizontal"
        aria-labelledby="journey-heading"
      >
        <div ref={stage} className="journey-stage">
          <div className="journey-heading">
            <div>
              <p className="journey-kicker">MỖI LÀN HƯƠNG, MỘT CÁCH GẦN GŨI</p>
              <h2 id="journey-heading">
                Ba cách để <em>thưởng trầm.</em>
              </h2>
            </div>
            <span className="journey-hint">
              <MoveHorizontal size={18} />
              Cuộn để khám phá
            </span>
          </div>
          <div
            ref={track}
            className="journey-track"
            role="region"
            aria-roledescription="carousel"
            aria-label="Cuộn, kéo hoặc dùng phím mũi tên để khám phá ba cách thưởng trầm"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                revealWorld(
                  Math.max(
                    0,
                    Math.min(2, world + (event.key === "ArrowRight" ? 1 : -1)),
                  ),
                );
              }
            }}
            onPointerDown={(event) => {
              didDrag.current = false;
              if (
                event.button === 0 &&
                event.pointerType === "mouse" &&
                root.current?.classList.contains("journey-enhanced")
              )
                drag.current = {
                  x: event.clientX,
                  position: galleryPosition.current,
                };
            }}
            onPointerMove={(event) => {
              if (!drag.current || !horizontal.current) return;
              const delta = event.clientX - drag.current.x;
              if (Math.abs(delta) < 6 && !didDrag.current) return;
              didDrag.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              const width =
                (track.current?.firstElementChild as HTMLElement)
                  ?.offsetWidth || 600;
              const position = Math.max(
                0,
                Math.min(2, drag.current.position - delta / width),
              );
              const top =
                horizontal.current.getBoundingClientRect().top +
                window.scrollY -
                80;
              window.scrollTo({
                top:
                  top +
                  ((horizontal.current.offsetHeight -
                    (window.innerHeight - 80)) *
                    position) /
                    2,
                behavior: "instant",
              });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onClickCapture={(event) => {
              if (didDrag.current) {
                event.preventDefault();
                event.stopPropagation();
                didDrag.current = false;
              }
            }}
            onDragStart={(event) => event.preventDefault()}
            onScroll={() => {
              if (
                !root.current?.classList.contains("journey-enhanced") &&
                track.current
              )
                setWorld(
                  Math.min(
                    2,
                    Math.round(
                      track.current.scrollLeft /
                        Math.max(
                          1,
                          (track.current.firstElementChild as HTMLElement)
                            ?.offsetWidth + (window.innerWidth < 900 ? 20 : 32),
                        ),
                    ),
                  ),
                );
            }}
          >
            {worlds.map((item, index) => (
              <article key={item.tag} className="journey-world">
                <Link
                  href={item.href}
                  className="journey-world-image"
                  aria-label={`Khám phá: ${item.title}`}
                  onFocus={() => revealWorld(index)}
                  onClick={(event) => {
                    if (
                      root.current?.classList.contains("journey-enhanced") &&
                      world !== index
                    ) {
                      event.preventDefault();
                      revealWorld(index);
                    }
                  }}
                  onPointerMove={(event) => {
                    if (event.pointerType !== "mouse") return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    event.currentTarget.style.setProperty(
                      "--card-x",
                      `${((event.clientX - rect.left) / rect.width) * 100}%`,
                    );
                    event.currentTarget.style.setProperty(
                      "--card-y",
                      `${((event.clientY - rect.top) / rect.height) * 100}%`,
                    );
                  }}
                >
                  <Image
                    src={item.image}
                    alt={item.tag}
                    fill
                    sizes="(max-width: 899px) 85vw, 58vw"
                    draggable={false}
                  />
                  <span className="journey-world-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span className="journey-card-action">
                    <ArrowUpRight size={23} />
                    Khám phá
                  </span>
                </Link>
                <div className="journey-world-copy">
                  <p className="journey-kicker">{item.tag}</p>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Link href={item.href} onFocus={() => revealWorld(index)}>
                    {item.detail}
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="journey-selected-copy">
            <div key={world} className="journey-selected-text">
              <p className="journey-kicker">{worlds[world].tag}</p>
              <h3 aria-label={worlds[world].title}>
                {worlds[world].title.split(/\s+/).map((word, index) => (
                  <Fragment key={`${world}-${index}`}>
                    <span
                      aria-hidden="true"
                      className="journey-caption-word"
                      style={{ animationDelay: `${80 + index * 55}ms` }}
                    >
                      {word}
                    </span>{" "}
                  </Fragment>
                ))}
              </h3>
              <p>{worlds[world].text}</p>
            </div>
            <div className="journey-selected-action">
              <span>
                <strong>0{world + 1}</strong> / 03
              </span>
              <Link href={worlds[world].href}>
                {worlds[world].detail}
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className="journey-toolbar">
            <div className="journey-dots" aria-label="Chuyển câu chuyện">
              {worlds.map((item, index) => (
                <button
                  key={item.tag}
                  onClick={() => revealWorld(index)}
                  aria-label={item.tag}
                  aria-pressed={world === index}
                >
                  0{index + 1}
                </button>
              ))}
            </div>
            <div className="journey-progress" aria-hidden="true">
              <span />
            </div>
            <div className="journey-arrows">
              <button
                aria-label="Câu chuyện trước"
                disabled={world === 0}
                onClick={() => revealWorld(Math.max(0, world - 1))}
              >
                <ArrowLeft size={19} />
              </button>
              <button
                aria-label="Câu chuyện tiếp theo"
                disabled={world === 2}
                onClick={() => revealWorld(Math.min(2, world + 1))}
              >
                <ArrowRight size={19} />
              </button>
            </div>
          </div>
        </div>
      </section>
      <section
        id="ben-trong-vong-tram"
        ref={sculpture}
        className="journey-sculpture"
        aria-labelledby="sculpture-heading"
      >
        <div ref={sculptureStage} className="journey-sculpture-stage">
          <header className="journey-sculpture-heading">
            <div>
              <p className="journey-kicker">BÀN KHÁM PHÁ · THIÊN PHÚC</p>
              <h2 id="sculpture-heading">
                Bên trong một <em>vòng trầm.</em>
              </h2>
            </div>
            <p className="journey-sculpture-hint">
              <ArrowDown size={16} />
              Cuộn để khám phá · Hoặc chọn điểm trên vòng
            </p>
          </header>
          <div className="journey-workbench">
            <div className="journey-sculpture-object">
              <span className="journey-object-orbit" aria-hidden="true" />
              <span className="journey-desk-mark" aria-hidden="true">
                THIÊN PHÚC
                <br />
                <small>AGARWOOD ATELIER</small>
              </span>
              <Image
                className={
                  ready
                    ? "journey-poster journey-poster-hidden"
                    : "journey-poster"
                }
                src="/editorial/preview-bracelet.webp"
                alt="Vòng trầm hương với các hạt gỗ nâu"
                fill
                sizes="(max-width: 899px) 100vw, 60vw"
              />
              <canvas
                ref={canvas}
                aria-hidden="true"
                className={ready ? "is-ready" : ""}
              />
              <div
                className="journey-hotspots"
                aria-label="Khám phá chi tiết vòng trầm"
              >
                {details.map((item, index) => (
                  <button
                    key={item.label}
                    className={`journey-hotspot journey-hotspot-${index} ${detail === index ? "is-active" : ""}`}
                    onClick={() => selectDetail(index)}
                    aria-pressed={detail === index}
                  >
                    <span className="journey-hotspot-dot">0{index + 1}</span>
                    <span className="journey-hotspot-line" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <span className="journey-object-caption">
                MÔ HÌNH MINH HỌA · KHÁM PHÁ HÌNH DÁNG & CẤU TRÚC
              </span>
            </div>
            <aside
              className="journey-inspector"
              aria-label="Thông tin và tùy chỉnh vòng trầm"
            >
              <div className="journey-inspector-top">
                <span>GÓC NHÌN 0{detail + 1} / 03</span>
                <ZoomIn size={16} />
              </div>
              <div className="journey-detail-stack">
                {details.map((item, index) => (
                  <article
                    key={item.title}
                    className={`journey-detail ${index === detail ? "is-active" : ""}`}
                  >
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
              <fieldset className="journey-tone-picker">
                <legend>
                  Sắc gỗ <span>{tones[tone].name}</span>
                </legend>
                <div>
                  {tones.map((item, index) => (
                    <button
                      key={item.name}
                      type="button"
                      style={{ backgroundColor: item.color }}
                      onClick={() => setTone(index)}
                      aria-label={item.name}
                      aria-pressed={tone === index}
                      disabled={!ready}
                    />
                  ))}
                </div>
              </fieldset>
              <div className="journey-light-picker">
                <span>
                  <Sun size={15} />
                  Ánh sáng
                </span>
                <div>
                  {["Ấm", "Tự nhiên"].map((name, index) => (
                    <button
                      key={name}
                      aria-pressed={light === index}
                      disabled={!ready}
                      onClick={() => setLight(index)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <button className="journey-reset" onClick={() => selectDetail(0)}>
                <RotateCcw size={14} />
                Ghép lại vòng
              </button>
              <div className="journey-reference">
                <div>
                  <Image
                    src="/references/annhien/bracelet-detail.jpg"
                    alt="Ảnh tham khảo bề mặt hạt trầm thật"
                    fill
                    sizes="88px"
                  />
                </div>
                <p>
                  Quan sát chất gỗ thật<small>Ảnh tham khảo · An Nhiên</small>
                </p>
                <Link
                  href="/3d-lab?mau=bracelet"
                  aria-label="Xem ảnh tham khảo và mô hình vòng trầm"
                >
                  <ArrowUpRight size={18} />
                </Link>
              </div>
              <Link className="journey-explore" href="/products/catalog">
                Tìm vòng trầm phù hợp
                <ArrowUpRight size={18} />
              </Link>
            </aside>
          </div>
          <nav
            className="journey-scene-nav"
            aria-label="Chuyển góc nhìn vòng trầm"
          >
            {details.map((item, index) => (
              <button
                key={item.label}
                onClick={() => selectDetail(index)}
                aria-pressed={detail === index}
              >
                <span>0{index + 1}</span>
                {item.note}
                <ArrowRight size={15} />
              </button>
            ))}
          </nav>
          <p className="journey-exit-note" aria-hidden="true">
            Một vòng trầm. Một câu chuyện còn tiếp.
            <ArrowDown size={14} />
          </p>
        </div>
      </section>
    </div>
  );
}
