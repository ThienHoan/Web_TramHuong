# UI upgrade — implementation and verification

Implemented locally on 31/10/2026. Preview: http://localhost:3000/vi and http://localhost:3000/en. No deployment or database edits were performed.

## Delivered

- Vietnamese homepage rebuilt as a warm editorial storefront, split into focused components rather than a single large component.
- Layered hero with scroll parallax and restrained pointer tilt; English hero shares the interaction but has localized copy and a quieter palette.
- Embla collection gallery with drag, buttons and a light perspective treatment. Actual catalog categories are used when available; editorial links are used when no categories are supplied.
- Sticky three-chapter story with scroll-linked image crossfades. Mobile and reduced-motion versions show individual static chapter images without pinning.
- Product cards with second-image hover, wishlist and quick view. Quick view supports variants, stock availability, existing discount calculation and the existing cart provider.
- Cart drawer for both locales, with quantity controls, removal, subtotal and checkout navigation. Quantity calls use the provider's actual absolute-quantity contract.
- Mobile Vietnamese navigation uses Radix Sheet for keyboard focus, background lock and Escape behavior. The desktop header exposes navigation at 1200px and above.
- Product detail gains an accessible image lightbox and a matching warm palette. Variant prices and IDs now follow the selected variant when adding to cart.
- Lenis cleanup cancels RAF; touch, reduced-motion and transactional routes use native scrolling. Open dialogs pause background Lenis scrolling. MotionConfig respects user preferences across the app.
- ScrollReveal is progressive: content is visible before JavaScript runs; only offscreen elements are hidden once observation is active. Removed global blur, transition-all and permanent will-change.
- Chat sits beneath modal overlays; footer links have larger hit areas; repeated announcement copies are hidden from assistive technology.
- Three existing editorial images are now local WebP assets totaling 81,806 bytes. Product and article records remain unchanged.
- Homepage products and published articles load concurrently; the English homepage avoids an unused article request.

## Verification

`npx tsc --noEmit` passed. Targeted ESLint passed for the modified app/component files.

`apps/web/scripts/qa-home.cjs` ran against the existing local frontend/API using a fresh browser context. Passed:

- Responsive layouts at 375, 390, 768, 1200, 1440 and 1920px, with no horizontal overflow and one main heading.
- Loaded homepage images had no broken-image results in the tested catalog state.
- Mobile navigation, cart drawer, Escape close and focus restoration.
- Background scrolling remains locked behind the cart overlay.
- Quick view, an available variant added to the guest cart, quantity increase/decrease, removal and the localized checkout link.
- Reduced motion removes the sticky story and exposes static chapter images.
- Product detail lightbox opens and closes.
- English homepage and English cart drawer render; the English homepage has no overflow at 375px.
- A touch-device context uses native scrolling.
- No page errors were recorded in this scenario. This does not establish that every authenticated/backend flow is error-free.

Screenshots and machine-readable results are in `apps/web/.next/qa-home/` (ignored build/QA output). The QA script accepts `PLAYWRIGHT_MODULE` for an existing Playwright installation; no test/browser dependency was added to package.json.

The UI/UX skill's `probe.mjs --quick` also ran at 375/1440px. Measured contrast failures and footer hit-area problems from its first pass were corrected. Remaining classifications require storefront-specific interpretation:

| Probe classification | Disposition |
| --- | --- |
| P1: announcement text outside the clipped container | Intentional marquee; hover pauses it. Duplicate copies are aria-hidden. Reduced motion disables movement and exposes native horizontal overflow. |
| P2: next collection/title partially clipped on mobile | Intentional carousel preview, with swipe and explicit previous/next controls. No page-wide overflow. |
| P3: collection lifts/rotates on hover | Intentional storefront depth interaction from the approved direction, with top gutter and reduced-motion fallback. The app-list prohibition is not applied to this marketing gallery. |
| Small metadata and editorial heading/body scale differences | Retained for hierarchy after visual inspection; product prices and main actions use larger readable type. These are not dashboard list rows. |

## Build and remaining limits

`npm run build` compiled successfully, passed its TypeScript step and generated static pages, but failed during standalone packaging because this Windows host denies symlink creation (`EPERM`). Repeating outside the sandbox had the same result. Production output configuration was preserved. A full standalone artifact still needs verification on a host with symlink support, such as the existing Linux deployment environment.

The local catalog includes a test screenshot used as a product photo and sample article content. The UI renders those records as supplied; it does not replace live catalog content with invented products. Editorial assets are reused 512px images, not new brand photography or transparent product cutouts.

Not verified: Safari/iOS hardware, authenticated cart synchronization, payment completion, production Core Web Vitals, comparative pre-upgrade performance or a universal 60fps target. No payment/order was submitted. Three.js, generated footage, detailed grain-to-product morphing, full font deduplication and a complete redesign of every transactional/admin route are not part of this delivered pass; existing transactional behavior is preserved.
