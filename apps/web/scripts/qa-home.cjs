/* Run with PLAYWRIGHT_MODULE pointing at an installed Playwright package. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

(async () => {
  const out = path.resolve(".next/qa-home");
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const report = { layouts: [], interactions: [], errors: [] };
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.goto("http://localhost:3000/vi", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.locator("#home-heading").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1600);
    console.log(
      "desktop-style",
      await page.evaluate(() => ({
        width: innerWidth,
        rootFont: getComputedStyle(document.documentElement).fontSize,
        heroOpacity: getComputedStyle(document.querySelector(".tp-hero-copy"))
          .opacity,
        nav: getComputedStyle(document.querySelector("header nav")).display,
      })),
    );
    await page.screenshot({ path: path.join(out, "hero-desktop.png") });
    // Load below-fold images before full-page visual inspection.
    await page.evaluate(async () => {
      const images = [...document.images];
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode().catch(() => {})));
    });
    for (const width of [1440, 1920, 1200, 768, 390, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1500);
      const measurements = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        h1s: document.querySelectorAll("h1").length,
        brokenImages: Array.from(document.images)
          .filter((i) => i.complete && !i.naturalWidth)
          .map((i) => i.currentSrc),
      }));
      report.layouts.push(measurements);
      assert.ok(
        measurements.scrollWidth <= width,
        `Horizontal overflow at ${width}`,
      );
      assert.equal(measurements.h1s, 1, "One main heading");
      await page.screenshot({
        path: path.join(out, `home-${width}.png`),
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "Khám phá Thiên Phúc" })
      .waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    report.interactions.push("Mobile navigation opens and closes");
    await page.getByRole("button", { name: /Mở giỏ hàng/ }).click();
    await page.getByRole("dialog").waitFor();
    const backgroundScroll = await page.evaluate(() => scrollY);
    await page.mouse.move(5, 500);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(350);
    assert.equal(
      await page.evaluate(() => scrollY),
      backgroundScroll,
      "Background remains locked behind cart",
    );
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.ok(
      await page
        .getByRole("button", { name: /Mở giỏ hàng/ })
        .evaluate((el) => el === document.activeElement),
    );
    report.interactions.push("Cart drawer opens, Escape closes, focus returns");
    const quick = page.getByRole("button", { name: "Xem nhanh", exact: true });
    if (await quick.count()) {
      await quick.first().click();
      await page.getByRole("dialog").waitFor();
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(out, "quick-view-mobile.png") });
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      report.interactions.push("Product quick view opens and closes");
      await quick.first().click();
      const add = page.getByRole("button", {
        name: "Thêm vào giỏ hàng",
        exact: true,
      });
      if (await add.isEnabled()) {
        await add.click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page.getByRole("button", { name: /Mở giỏ hàng/ }).click();
        const drawer = page.getByRole("dialog");
        await drawer
          .getByRole("link", { name: "Tiến hành thanh toán" })
          .waitFor();
        assert.equal(
          await drawer
            .getByRole("link", { name: "Tiến hành thanh toán" })
            .getAttribute("href"),
          "/vi/checkout",
        );
        await page.waitForTimeout(650);
        await page.screenshot({ path: path.join(out, "cart-mobile.png") });
        await drawer
          .getByRole("button", { name: /Tăng số lượng/ })
          .first()
          .click();
        await drawer
          .getByRole("button", { name: /Giảm số lượng/ })
          .first()
          .click();
        await drawer.getByRole("button", { name: /Xóa/ }).first().click();
        await page.keyboard.press("Escape");
        report.interactions.push(
          "Available variant adds to guest cart; quantity, removal and checkout link work",
        );
      } else {
        await page.keyboard.press("Escape");
        report.interactions.push("Out-of-stock item correctly prevents adding");
      }
    } else
      report.interactions.push(
        "Product quick view unavailable: live catalog is empty",
      );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#cau-chuyen").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(out, "story-desktop.png") });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(250);
    assert.equal(await page.locator(".tp-story-visual").isVisible(), false);
    assert.equal(
      await page.locator(".tp-story-mobile-image").first().isVisible(),
      true,
    );
    report.interactions.push(
      "Reduced motion removes sticky story and exposes static chapter images",
    );
    await page.screenshot({
      path: path.join(out, "reduced-motion.png"),
      fullPage: true,
    });
    const detailHref = await page
      .locator(".tp-product-image a")
      .first()
      .getAttribute("href")
      .catch(() => null);
    if (detailHref) {
      await page.goto(`http://localhost:3000${detailHref}`, {
        waitUntil: "networkidle",
      });
      await page.getByRole("button", { name: "Phóng to ảnh sản phẩm" }).click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      report.interactions.push(
        "Product detail image lightbox opens and closes",
      );
    }
    await page.goto("http://localhost:3000/en", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    assert.ok(await page.locator("h1").count());
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.waitForTimeout(1000);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      375,
      "English homepage has no mobile overflow",
    );
    await page.screenshot({ path: path.join(out, "english-mobile.png") });
    await page.getByRole("button", { name: /Open cart/ }).click();
    await page.getByRole("heading", { name: "Your shopping bag" }).waitFor();
    await page.keyboard.press("Escape");
    report.interactions.push("English homepage renders");
    await context.close();
    const touch = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const touchPage = await touch.newPage();
    await touchPage.goto("http://localhost:3000/vi", {
      waitUntil: "networkidle",
    });
    assert.equal(
      await touchPage.evaluate(() =>
        document.documentElement.classList.contains("lenis"),
      ),
      false,
      "Touch uses native scrolling",
    );
    await touchPage.screenshot({ path: path.join(out, "touch-mobile.png") });
    report.interactions.push("Touch device uses native scrolling");
    await touch.close();
  } finally {
    await browser.close();
    writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
