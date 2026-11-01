"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PreviewController, PreviewMode, PreviewOptions } from "./types";

export default function PreviewCanvas({
  mode,
  options,
  onSelect,
  autoStart = true,
}: {
  mode: PreviewMode;
  options: PreviewOptions;
  onSelect: (index: number) => void;
  autoStart?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<PreviewController | null>(null);
  const latest = useRef(options);
  const [activated, setActivated] = useState(autoStart);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    latest.current = options;
    controller.current?.update(options);
  }, [options]);
  useEffect(() => {
    if (!activated) return;
    let cancelled = false;
    const onLost = () => {
      controller.current?.dispose();
      controller.current = null;
      setStatus("error");
    };
    let started = false;
    const start = () => {
      if (started || cancelled) return;
      started = true;
      import("./createPreviewScene")
        .then(({ createPreviewScene }) => {
          if (cancelled || !canvas.current) return;
          controller.current = createPreviewScene(
            canvas.current,
            mode,
            latest.current,
            onSelect,
            onLost,
          );
          setStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    };
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visibility.disconnect();
          start();
        }
      },
      { rootMargin: "200px" },
    );
    if (canvas.current) visibility.observe(canvas.current);
    return () => {
      cancelled = true;
      visibility.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [mode, onSelect, activated]);

  return (
    <div className="lab-canvas" data-status={status}>
      {status !== "ready" && (
        <div className="lab-canvas-fallback">
          <Image
            src={`/editorial/preview-${mode}.webp`}
            alt="Bản xem trước không gian trầm hương"
            fill
            sizes="(max-width: 800px) 100vw, 70vw"
          />
          {!activated ? (
            <button className="lab-activate" onClick={() => setActivated(true)}>
              Mở không gian 3D <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <span role="status">
              {status === "loading"
                ? "Đang mở không gian 3D…"
                : "Bạn đang xem ảnh tĩnh. Trình duyệt này chưa mở được chế độ 3D."}
            </span>
          )}
        </div>
      )}
      <canvas
        ref={canvas}
        aria-label="Vật phẩm trầm hương 3D. Kéo ngang để xoay; dùng các nút bên cạnh để đổi góc nhìn và phóng to."
        aria-hidden={status !== "ready"}
      />
      {status === "ready" && (
        <button
          className="lab-reset-camera"
          onClick={() => controller.current?.resetCamera()}
        >
          Đặt lại góc nhìn
        </button>
      )}
    </div>
  );
}
