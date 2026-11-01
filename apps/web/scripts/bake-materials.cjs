/* Bake the original procedural PBR maps offline; never run this work during scroll. */
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");
const size = 512;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (n) => Math.max(0, Math.min(1, n));
function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function noise(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let fx = x - ix,
    fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  return lerp(
    lerp(hash(ix, iy), hash(ix + 1, iy), fx),
    lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx),
    fy,
  );
}
function fbm(x, y) {
  return (
    noise(x, y) * 0.57 +
    noise(x * 2.07, y * 2.07) * 0.28 +
    noise(x * 4.17, y * 4.17) * 0.15
  );
}
(async () => {
  const out = path.resolve("public/editorial/materials");
  fs.mkdirSync(out, { recursive: true });
  for (const kind of ["wood", "powder", "ceramic"]) {
    const data = Array.from(
      { length: 3 },
      () => new Uint8ClampedArray(size * size * 4),
    );
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const u = x / size,
          v = y / size,
          fine = hash(x, y),
          soft = fbm(u * 9, v * 9);
        let shade = 0.9 + soft * 0.16,
          height = 0.5 + (fine - 0.5) * 0.17,
          rough = 0.83,
          base = [149, 119, 84];
        if (kind === "wood") {
          const warp =
            fbm(u * 3, v * 3) * 2.6 + Math.sin(u * Math.PI * 4) * 0.35;
          const grain = Math.pow(
            (Math.sin((v * 32 + warp) * Math.PI * 2) + 1) / 2,
            14,
          );
          const resin = Math.max(0, fbm(u * 3, v * 38) - 0.55) * 1.5,
            pits = fine > 0.978 ? 0.2 : 0;
          shade -= grain * 0.3 + resin * 0.4 + pits;
          height -= grain * 0.17 + resin * 0.08 + pits;
          rough = 0.8 + soft * 0.15;
        } else if (kind === "powder") {
          base = [137, 104, 71];
          shade = 0.85 + soft * 0.24 + (fine - 0.5) * 0.17;
          height = 0.35 + fine * 0.4 + soft * 0.15;
          rough = 0.96;
        } else {
          base = [255, 255, 255];
          shade = 0.93 + soft * 0.06;
          height = 0.45 + fine * 0.08;
          rough = 0.4 + soft * 0.14;
        }
        const offset = (y * size + x) * 4;
        for (let c = 0; c < 3; c++) {
          data[0][offset + c] = Math.min(255, base[c] * shade);
          data[1][offset + c] = clamp(height) * 255;
          data[2][offset + c] = rough * 255;
        }
        for (const d of data) d[offset + 3] = 255;
      }
    for (let i = 0; i < 3; i++) {
      const name = kind + "-" + ["color", "bump", "roughness"][i] + ".webp";
      await sharp(Buffer.from(data[i].buffer), {
        raw: { width: size, height: size, channels: 4 },
      })
        .webp({ lossless: true })
        .toFile(path.join(out, name));
      console.log(name);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
