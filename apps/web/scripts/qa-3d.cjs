const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { mkdirSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const sharp = require("sharp");

(async () => {
  const out = path.resolve(".next/qa-3d");
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const page = await context.newPage();
  const report = { scenes: [], checks: [], errors: [] };
  page.on("pageerror", (e) => report.errors.push(e.message));
  try {
    await page.goto("http://localhost:3000/vi/3d-lab", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    for (const [mode, name] of [
      ["bracelet", "Vòng trầm trong tay"],
      ["ritual", "Một góc thưởng hương"],
      ["gallery", "Phòng trưng bày xoay"],
    ]) {
      await page.getByRole("tab", { name: new RegExp(name) }).click();
      await page
        .locator('.lab-canvas[data-status="ready"]')
        .waitFor({ timeout: 30000 });
      await page.locator(".lab-canvas").scrollIntoViewIfNeeded();
      await page.waitForTimeout(1800);
      const canvas = page.locator(".lab-canvas canvas");
      const draws = Number(await canvas.getAttribute("data-draw-calls"));
      assert.ok(draws > 0, `WebGL draws objects in ${mode}`);
      const overlayStyle = await page.addStyleTag({
        content:
          ".lab-scene-label,.lab-reset-camera{visibility:hidden!important}",
      });
      const screenshot = await canvas.screenshot();
      await overlayStyle.evaluate((el) => el.remove());
      await sharp(screenshot)
        .resize(1000)
        .webp({ quality: 87 })
        .toFile(path.resolve(`public/editorial/preview-${mode}.webp`));
      await page.screenshot({
        path: path.join(out, `${mode}-desktop.png`),
        fullPage: true,
      });
      report.scenes.push({ mode, drawCalls: draws });
      if (mode === "bracelet") {
        await page.getByRole("button", { name: "Gỗ sẫm", exact: true }).click();
        assert.equal(
          await page
            .getByRole("button", { name: "Gỗ sẫm", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        await page.getByRole("button", { name: /Xem từng hạt/ }).click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(out, "bracelet-detail.png") });
        report.checks.push("Wood selection and bead separation");
      }
      if (mode === "ritual") {
        await page
          .getByRole("button", { name: "Chiều muộn", exact: true })
          .click();
        await page.getByRole("button", { name: /Thắp một làn hương/ }).click();
        assert.equal(
          await page
            .getByRole("button", { name: /Thắp một làn hương/ })
            .getAttribute("aria-pressed"),
          "false",
        );
        report.checks.push("Light selection and smoke toggle");
      }
      if (mode === "gallery") {
        await page
          .getByRole("button", { name: "Vật phẩm tiếp theo", exact: true })
          .click();
        assert.ok(
          (await page.locator(".lab-gallery-picker strong").innerText()) ===
            "Lư thưởng hương",
        );
        report.checks.push("Gallery navigation");
      }
      await page.getByRole("button", { name: "Phóng to", exact: true }).click();
      await page
        .getByRole("button", { name: "Đặt lại góc nhìn", exact: true })
        .click();
    }
    for (const width of [1440, 768, 390, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(400);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        width,
        `No overflow at ${width}`,
      );
    }
    await page.getByRole("tab", { name: /Vòng trầm trong tay/ }).click();
    await page.locator('.lab-canvas[data-status="ready"]').waitFor();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(out, "mobile.png"),
      fullPage: true,
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "Đang dùng chế độ giảm chuyển động" })
      .waitFor();
    report.checks.push("Responsive widths 375/390/768/1440 and reduced motion");
    const canvas = page.locator(".lab-canvas canvas");
    await canvas.evaluate((c) =>
      c.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext(),
    );
    await page.locator('.lab-canvas[data-status="error"]').waitFor();
    await page.screenshot({ path: path.join(out, "fallback.png") });
    report.checks.push("WebGL context loss falls back to poster");
    await page.goto("http://localhost:3000/vi", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.locator(".lab-embedded .lab-canvas").scrollIntoViewIfNeeded();
    await page
      .locator('.lab-embedded .lab-canvas[data-status="ready"]')
      .waitFor();
    assert.equal(
      await page.locator("h1").count(),
      1,
      "Embedded experience does not add another main heading",
    );
    for (const name of [
      "Vòng trầm trong tay",
      "Một góc thưởng hương",
      "Phòng trưng bày xoay",
    ]) {
      await page.getByRole("tab", { name: new RegExp(name) }).click();
      await page
        .locator('.lab-embedded .lab-canvas[data-status="ready"]')
        .waitFor();
    }
    assert.equal(
      new URL(page.url()).searchParams.has("mau"),
      false,
      "Home interactions preserve homepage URL",
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      375,
    );
    await page.screenshot({
      path: path.join(out, "home-integrated-mobile.png"),
      fullPage: true,
    });
    report.checks.push(
      "All three scenes integrated into homepage; one h1, no mobile overflow, URL unchanged",
    );
    assert.deepEqual(report.errors, []);
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
