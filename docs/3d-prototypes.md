# Three interactive UI concepts for review

Review URL: http://localhost:3000/vi/3d-lab

| Concept | Direct link | Working interactions |
| --- | --- | --- |
| 01 — Vòng trầm trong tay | `/vi/3d-lab?mau=bracelet` | Orbit, zoom buttons, three wood tones, bead separation, pause auto-rotation, reset |
| 02 — Một góc thưởng hương | `/vi/3d-lab?mau=ritual` | Orbit, three lighting presets, smoke on/off, pause auto-rotation, reset |
| 03 — Phòng trưng bày xoay | `/vi/3d-lab?mau=gallery` | Orbit, choose a display directly, previous/next, item selectors, zoom and reset |

The user selected a combination of all three experiences. They are now available in one interactive section on the Vietnamese storefront homepage (`/vi#trai-nghiem-tram`), with the ritual scene selected initially. Only the active scene is mounted; loading starts when its viewport approaches the screen. The standalone lab remains available for comparison and source-photo attribution, and is marked noindex.

The follow-up reference is https://tramhuongannhien.vn/. Selected products are VT8TC (21 round wooden beads), GOM1 (celadon tripod burner) and NPT (molded incense cones). Source photographs are retained unchanged under public/references/annhien and shown with attribution in the lab only. The homepage uses reconstructed 3D objects and generated posters, not the reference brand's catalog photographs.

Models now include drilled bead geometry with aligned cord holes and per-bead variation, matte wood grain/bump/roughness maps, a hollow squat burner with a cutout dome and three feet, and separate granular incense material. The small tea cup and burner feet sit on their support surfaces. Shapes, hidden sides and surface maps are reconstructed/inferred from photographs; these are not product scans or supplier GLB models and are not claimed to match a Thien Phuc SKU.

Implementation: one Three.js renderer at a time, dynamically imported only on the preview route. Uses OrbitControls, local RoomEnvironment lighting, PBR materials, instanced beads/decoration, one shadow-casting light and locally generated preview posters. No remote models, HDR assets, font or texture requests are required by the scene.

Quality measures: DPR cap, visibility-based frame suspension, render-on-demand for idle scenes, reduced-motion subscription, manual controls, static fallback on WebGL initialization failure/context loss and explicit disposal on scene switch/unmount. Normal touch page scrolling is retained with a horizontal-drag hint. Shop chat/scroll-top widgets are suppressed on this comparison route so they do not cover controls.

Verification uses `apps/web/scripts/qa-3d.cjs` with an installed Playwright package supplied through PLAYWRIGHT_MODULE. Reports and desktop/mobile screenshots live under `apps/web/.next/qa-3d/`. Posters under public/editorial are generated from the actual rendered scenes, with UI overlays temporarily hidden during capture.

No deployment was requested. TypeScript and targeted ESLint checks passed. Browser QA covers the three reference scenes, their controls, responsive widths, reduced motion, context-loss fallback and the combined homepage section. Production performance on actual customer devices and exact matching to the user's own physical products remain separate validation steps.
