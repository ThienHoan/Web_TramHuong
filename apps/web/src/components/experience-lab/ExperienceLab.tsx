"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  MoveHorizontal,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import PreviewCanvas from "./PreviewCanvas";
import { LotusIcon } from "@/components/icons/BrandIcons";
import {
  DEFAULT_OPTIONS,
  GALLERY_ITEMS,
  type PreviewMode,
  type PreviewOptions,
} from "./types";
import "./experience-lab.css";
import type { ExperienceShoppingLinks } from "@/lib/experience-shopping";

const CONCEPTS = [
  {
    id: "bracelet" as const,
    number: "01",
    title: "Vòng trầm trong tay",
    short: "Một góc nhìn, một nét vân.",
    description:
      "Xoay vòng trầm dưới ánh sáng, thử ba sắc gỗ và tách từng hạt để ngắm chi tiết.",
    tag: "TƯƠNG TÁC VỚI VẬT PHẨM",
    fit: "Phù hợp cho trang chủ và trang chi tiết vòng trầm.",
    features: ["Xoay đa hướng", "Thử sắc gỗ", "Xem từng hạt"],
  },
  {
    id: "ritual" as const,
    number: "02",
    title: "Một góc thưởng hương",
    short: "Không gian chuyển mình theo bạn.",
    description:
      "Thắp một làn hương, thay ánh sáng từ ban ngày sang chiều ấm và tìm góc nhìn cho riêng mình.",
    tag: "TRẢI NGHIỆM KHÔNG GIAN",
    fit: "Phù hợp cho hero thương hiệu và bộ sưu tập thưởng trầm.",
    features: ["Thắp / tắt trầm", "Ba sắc ánh sáng", "Khói chuyển động"],
  },
  {
    id: "gallery" as const,
    number: "03",
    title: "Phòng trưng bày xoay",
    short: "Khám phá, theo một vòng tròn.",
    description:
      "Chọn một vật phẩm để đưa nó ra phía trước. Xoay góc nhìn, xem gần hơn rồi khám phá những sản phẩm cùng nhóm.",
    tag: "KHÁM PHÁ BỘ SƯU TẬP",
    fit: "Phù hợp cho khu danh mục hoặc bộ sưu tập nổi bật.",
    features: ["Chọn trực tiếp vật phẩm", "Gallery 360°", "Chuyển vị trí mượt"],
  },
];
const TONES = [
  { name: "Nâu trầm", color: "#b39972" },
  { name: "Gỗ sẫm", color: "#776348" },
  { name: "Nâu mật", color: "#b5aa91" },
];
const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const getMotionPreference = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ExperienceLab({
  initialMode = "bracelet",
  embedded = false,
  shoppingLinks,
}: {
  initialMode?: PreviewMode;
  embedded?: boolean;
  shoppingLinks?: ExperienceShoppingLinks;
}) {
  const [mode, setMode] = useState<PreviewMode>(initialMode);
  const [options, setOptions] = useState<PreviewOptions>(DEFAULT_OPTIONS);
  const reduce = useSyncExternalStore(
    subscribeMotion,
    getMotionPreference,
    () => false,
  );
  const concept = CONCEPTS.find((c) => c.id === mode)!;
  const patch = (value: Partial<PreviewOptions>) =>
    setOptions((current) => ({ ...current, ...value }));
  const onSelect = useCallback(
    (index: number) =>
      setOptions((current) => ({ ...current, galleryIndex: index })),
    [],
  );
  useEffect(() => {
    if (embedded) return;
    const url = new URL(window.location.href);
    url.searchParams.set("mau", mode);
    window.history.replaceState(null, "", url);
  }, [mode, embedded]);
  const choose = (next: PreviewMode) => {
    setMode(next);
    setOptions({ ...DEFAULT_OPTIONS });
  };
  const actualOptions = reduce ? { ...options, autoRotate: false } : options;
  const Heading = embedded ? "h2" : "h1";
  const Content = embedded ? "div" : "main";

  return (
    <div
      className={`lab-page ${embedded ? "lab-embedded" : ""}`}
      id={embedded ? "trai-nghiem-tram" : undefined}
    >
      <header className="lab-header">
        <Link href="/" className="lab-brand">
          <LotusIcon size={22} />
          <span>
            Thiên Phúc<small>KHÔNG GIAN TRẢI NGHIỆM</small>
          </span>
        </Link>
        <Link href="/" className="lab-back">
          <ArrowLeft size={15} /> Về trang chủ
        </Link>
      </header>
      <Content className="lab-main">
        <div className="lab-intro">
          <div>
            <p className="lab-eyebrow">
              {embedded
                ? "KHÁM PHÁ THẾ GIỚI TRẦM HƯƠNG"
                : "BẢN DỰNG THEO ẢNH THAM CHIẾU"}
            </p>
            <Heading>
              Chạm vào hương.
              <br />
              <em>Theo cách của bạn.</em>
            </Heading>
          </div>
          <p>
            {embedded
              ? "Xoay một vòng trầm, thắp một làn hương hay dạo qua phòng trưng bày. Chọn cách bạn muốn khám phá."
              : "Hạt gỗ mộc, men gốm xanh xám và bề mặt trầm nén. Khám phá ba trải nghiệm được dựng lại từ ảnh sản phẩm thật."}
          </p>
        </div>
        <div
          className="lab-concepts"
          role="tablist"
          aria-label="Ba mẫu giao diện 3D"
        >
          {CONCEPTS.map((item, index) => (
            <button
              key={item.id}
              id={`concept-${item.id}`}
              role="tab"
              aria-selected={mode === item.id}
              aria-controls="lab-stage-panel"
              tabIndex={mode === item.id ? 0 : -1}
              className={`lab-concept ${mode === item.id ? "is-selected" : ""}`}
              onClick={() => choose(item.id)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowRight") next = (index + 1) % 3;
                else if (event.key === "ArrowLeft") next = (index + 2) % 3;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = 2;
                else return;
                event.preventDefault();
                choose(CONCEPTS[next].id);
                document
                  .getElementById(`concept-${CONCEPTS[next].id}`)
                  ?.focus();
              }}
            >
              <div className="lab-concept-photo">
                <Image
                  src={`/editorial/preview-${item.id}.webp`}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 33vw, 30vw"
                />
                <span>{item.number}</span>
              </div>
              <div className="lab-concept-label">
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.short}</small>
                </span>
                <span className="lab-selected-mark">
                  {mode === item.id ? (
                    <Check size={17} />
                  ) : (
                    <ArrowUpRight size={17} />
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
        <section
          id="lab-stage-panel"
          className="lab-stage-panel"
          role="tabpanel"
          aria-labelledby={`concept-${mode}`}
        >
          <div className="lab-stage">
            <div className="lab-scene-label">
              <span className="lab-live-dot" /> KHÔNG GIAN {concept.number}
              <span className="lab-scene-tag">
                {mode === "gallery"
                  ? GALLERY_ITEMS[options.galleryIndex]
                  : "THIÊN PHÚC · ATELIER"}
              </span>
            </div>
            <PreviewCanvas
              autoStart={!embedded}
              key={mode}
              mode={mode}
              options={actualOptions}
              onSelect={onSelect}
            />
            <div className="lab-scene-toolbar">
              <span>
                <MoveHorizontal size={16} /> Kéo ngang để xoay
              </span>
              <div>
                <button
                  aria-label="Thu nhỏ"
                  disabled={options.zoom <= 0.8}
                  onClick={() =>
                    patch({ zoom: Math.max(0.8, options.zoom - 0.15) })
                  }
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  aria-label="Phóng to"
                  disabled={options.zoom >= 1.6}
                  onClick={() =>
                    patch({ zoom: Math.min(1.6, options.zoom + 0.15) })
                  }
                >
                  <ZoomIn size={18} />
                </button>
              </div>
            </div>
          </div>
          <aside className="lab-config">
            <p className="lab-eyebrow">
              {embedded ? (
                concept.tag
              ) : (
                <>
                  MẪU {concept.number} / {concept.tag}
                </>
              )}
            </p>
            <h2>{concept.title}</h2>
            <p className="lab-description">{concept.description}</p>
            {mode === "bracelet" && (
              <>
                <fieldset className="lab-fieldset">
                  <legend>Sắc gỗ bạn yêu thích</legend>
                  <div className="lab-swatches">
                    {TONES.map((tone, index) => (
                      <button
                        key={tone.name}
                        aria-label={tone.name}
                        aria-pressed={options.tone === index}
                        className={options.tone === index ? "is-active" : ""}
                        onClick={() => patch({ tone: index })}
                      >
                        <span style={{ background: tone.color }} />
                        {tone.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button
                  className={`lab-option ${options.expanded ? "is-active" : ""}`}
                  aria-pressed={options.expanded}
                  onClick={() => patch({ expanded: !options.expanded })}
                >
                  <span>
                    Xem từng hạt
                    <small>Tách nhẹ để cảm nhận cấu trúc vòng</small>
                  </span>
                  <span className="lab-toggle" />
                </button>
              </>
            )}
            {mode === "ritual" && (
              <>
                <fieldset className="lab-fieldset">
                  <legend>Ánh sáng của không gian</legend>
                  <div className="lab-light-options">
                    {["Nắng ấm", "Ban ngày", "Chiều muộn"].map(
                      (name, index) => (
                        <button
                          key={name}
                          aria-pressed={options.light === index}
                          className={options.light === index ? "is-active" : ""}
                          onClick={() => patch({ light: index })}
                        >
                          {name}
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
                <button
                  className={`lab-option ${options.smoke ? "is-active" : ""}`}
                  aria-pressed={options.smoke}
                  onClick={() => patch({ smoke: !options.smoke })}
                >
                  <span>
                    Thắp một làn hương
                    <small>Khói nhẹ trong không gian tĩnh</small>
                  </span>
                  <span className="lab-toggle" />
                </button>
              </>
            )}
            {mode === "gallery" && (
              <div className="lab-gallery-picker">
                <span>VẬT PHẨM ĐANG KHÁM PHÁ</span>
                <div>
                  <button
                    aria-label="Vật phẩm trước"
                    onClick={() =>
                      patch({ galleryIndex: (options.galleryIndex + 4) % 5 })
                    }
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <strong aria-live="polite">
                    {GALLERY_ITEMS[options.galleryIndex]}
                  </strong>
                  <button
                    aria-label="Vật phẩm tiếp theo"
                    onClick={() =>
                      patch({ galleryIndex: (options.galleryIndex + 1) % 5 })
                    }
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
                <div className="lab-gallery-dots">
                  {GALLERY_ITEMS.map((name, index) => (
                    <button
                      key={name}
                      className={
                        options.galleryIndex === index ? "is-active" : ""
                      }
                      aria-label={`Khám phá ${name}`}
                      aria-pressed={options.galleryIndex === index}
                      onClick={() => patch({ galleryIndex: index })}
                    >
                      <span />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode !== "gallery" && (
              <button
                className="lab-motion-button"
                disabled={!!reduce}
                aria-pressed={options.autoRotate && !reduce}
                onClick={() => patch({ autoRotate: !options.autoRotate })}
              >
                {options.autoRotate && !reduce ? (
                  <Pause size={15} />
                ) : (
                  <Play size={15} />
                )}{" "}
                {reduce
                  ? "Đang dùng chế độ giảm chuyển động"
                  : options.autoRotate
                    ? "Tạm dừng xoay tự động"
                    : "Bật xoay tự động"}
              </button>
            )}
            <div className="lab-config-bottom">
              {!embedded && <p>{concept.fit}</p>}
              <div className="lab-feature-tags">
                {concept.features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
              <button
                className="lab-reset"
                onClick={() =>
                  setOptions({ ...DEFAULT_OPTIONS, autoRotate: false })
                }
              >
                <RotateCcw size={14} /> Đặt lại tùy chọn
              </button>
            </div>
          </aside>
        </section>
        {embedded && (
          <div className="lab-home-note">
            <p>
              Hình 3D minh họa hình dáng và sắc độ. Xem ảnh thật ở từng sản phẩm
              trước khi chọn mua.
            </p>
            <Link href={shoppingLinks?.[mode] || "/products"}>
              Xem sản phẩm thật <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
        <div className="lab-comparison-note">
          <span>01 — 03</span>
          <p>
            Đây là các mẫu trải nghiệm để chọn hướng UI. Hình dáng và sắc gỗ
            mang tính minh họa, chưa đại diện cho một mã sản phẩm cụ thể.
          </p>
          <Link href={shoppingLinks?.[mode] || "/products"}>
            Ghé bộ sưu tập hiện tại <ArrowUpRight size={16} />
          </Link>
        </div>
      </Content>
      <footer className="lab-footer">
        <span>THIÊN PHÚC · TRẦM HƯƠNG VIỆT</span>
        <span>Bản dựng theo ảnh tham chiếu · Xoay để xem từng chi tiết.</span>
      </footer>
    </div>
  );
}
