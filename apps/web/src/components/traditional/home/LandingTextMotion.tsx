"use client";

import { useEffect } from "react";

/** Scroll-linked reading, scoped to static editorial copy (never live form/UI text). */
export default function LandingTextMotion() {
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("gsap/SplitText"),
      document.fonts.ready,
    ])
      .then(([{ gsap }, { ScrollTrigger }, { SplitText }]) => {
        const root = document.querySelector<HTMLElement>(".tp-home");
        if (disposed || !root) return;
        gsap.registerPlugin(ScrollTrigger, SplitText);
        const media = gsap.matchMedia();
        media.add(
          "(prefers-reduced-motion: no-preference)",
          () => {
            const headings = root.querySelectorAll<HTMLElement>(
              [
                ".tp-section-heading h2",
                ".journey-heading h2",
                ".journey-sculpture-heading h2",
                ".tp-story-chapter h3",
                ".tp-ritual-copy h2",
                ".tp-contact-band h2",
              ].join(","),
            );
            headings.forEach((heading) => {
              SplitText.create(heading, {
                type: "words",
                wordsClass: "tp-read-word",
                aria: "auto",
                onSplit(self) {
                // Initialize every word, including staggered words before the trigger starts.
                gsap.set(self.words, { opacity: 0.14, y: 12 });
                return gsap.to(
                  self.words,
                    {
                      opacity: 1,
                      y: 0,
                      duration: 1,
                      stagger: 0.085,
                      ease: "none",
                      scrollTrigger: {
                        trigger: heading,
                        start: "top 92%",
                        end: "top 55%",
                        scrub: 0.4,
                        invalidateOnRefresh: true,
                      },
                    },
                  );
                },
              });
            });
            root
              .querySelectorAll<HTMLElement>(
                [
                  ".tp-section-heading > p",
                  ".tp-section-heading .tp-eyebrow",
                  ".tp-story-chapter > p",
                  ".tp-ritual-copy > div > p:not(.tp-eyebrow)",
                  ".tp-journal-intro > p",
                ].join(","),
              )
              .forEach((copy) => {
                gsap.fromTo(
                  copy,
                  { opacity: 0.2, y: 16 },
                  {
                    opacity: 1,
                    y: 0,
                    ease: "none",
                    scrollTrigger: {
                      trigger: copy,
                      start: "top 94%",
                      end: "top 72%",
                      scrub: 0.4,
                      invalidateOnRefresh: true,
                    },
                  },
                );
              });
          },
          root,
        );
        const resize = new ResizeObserver(() => ScrollTrigger.refresh());
        resize.observe(root);
        ScrollTrigger.refresh();
        cleanup = () => {
          resize.disconnect();
          media.revert();
        };
      })
      .catch(() => {
        /* Content remains fully readable if enhancement cannot load. */
      });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return null;
}
