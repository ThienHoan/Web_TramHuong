const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const ts = require("typescript");
function runtime(response = {}) {
  const calls = [],
    cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const nativeRequire = createRequire(filename);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInNewContext(source, {
      exports,
      require(name) {
        if (name.startsWith("@/"))
          return load(path.join(__dirname, "../src", name.slice(2)) + ".ts");
        if (name.startsWith("."))
          return load(path.resolve(path.dirname(filename), name) + ".ts");
        return nativeRequire(name);
      },
      URL,
      URLSearchParams,
      process: { env: { NEXT_PUBLIC_API_URL: "https://api.example.test" } },
      console,
      fetch: async (url, options) => {
        calls.push({ url, options });
        return new Response(JSON.stringify(response));
      },
    });
    return exports;
  }
  return { load: (file) => load(path.join(__dirname, "../src", file)), calls };
}

test("Vietnamese slugs and query links stay valid", () => {
  const { blogSlug, blogUrl } = runtime().load("lib/blog.ts");
  assert.equal(
    blogSlug("  Đốt nụ trầm: Đúng cách!  "),
    "dot-nu-tram-dung-cach",
  );
  assert.equal(blogUrl({ page: 1 }), "/blog");
  const query = new URL(
    blogUrl({ page: 2, search: "hương & gỗ", category: "culture" }),
    "https://shop.test",
  ).searchParams;
  assert.equal(query.get("search"), "hương & gỗ");
  assert.equal(query.get("page"), "2");
});
test("public pagination uses the API last_page contract", async () => {
  const app = runtime({
    data: [
      { id: "1", slug: "story" },
      { id: "2", slug: "" },
    ],
    meta: { total: 25, page: 2, limit: 10, last_page: 3 },
  });
  const result = await app
    .load("services/blog-service.ts")
    .getPosts({ page: 2 });
  assert.equal(result.meta.totalPages, 3);
  assert.equal(result.meta.currentPage, 2);
  assert.equal(result.meta.totalItems, 25);
  assert.equal(result.data.length, 1);
  assert.equal(new URL(app.calls[0].url).pathname, "/api/posts");
});
test("admin published filter uses guarded endpoint and keeps missing slugs visible", async () => {
  const app = runtime({
    data: [{ id: "1", slug: "" }],
    meta: { total: 1, page: 1, limit: 12, last_page: 1 },
  });
  const result = await app.load("services/blog-service.ts").getPosts({
    admin: true,
    status: "published",
    category: "culture",
    sort: "title",
  });
  const url = new URL(app.calls[0].url);
  assert.equal(url.pathname, "/api/posts/admin/list");
  assert.equal(url.searchParams.get("category"), "culture");
  assert.equal(url.searchParams.get("sort"), "title");
  assert.equal(result.data.length, 1);
});
test("article rendering removes unsafe HTML and creates unique safe heading anchors", () => {
  const { prepareBlogArticle } = runtime().load("lib/blog-article.ts");
  const result = prepareBlogArticle(
    '<h1>Trầm &amp; hương</h1><h2>Trầm &amp; hương</h2><script>alert(1)</script><a href="javascript:alert(1)">click</a><img src="https://shop.test/a.jpg" onerror="alert(2)">',
  );
  assert.equal(result.headings.length, 2);
  assert.notEqual(result.headings[0].id, result.headings[1].id);
  assert.equal(result.headings[0].text, "Trầm & hương");
  assert.doesNotMatch(result.html, /<h1|<script|onerror|javascript:/i);
  assert.match(result.html, /loading="lazy"/);
});
test("SEO suggestions identify missing links and image descriptions", () => {
  const { blogSeoChecks } = runtime().load("lib/blog.ts");
  const checks = blogSeoChecks({
    title: "Bài viết",
    excerpt: "Mô tả",
    content: '<h2>Cách dùng</h2><img src="/photo.jpg" alt="">',
  });
  assert.equal(checks.find((item) => item.id === "description").done, true);
  assert.equal(checks.find((item) => item.id === "headings").done, true);
  assert.equal(checks.find((item) => item.id === "image-alt").done, false);
  assert.equal(checks.find((item) => item.id === "links").done, false);
});

test("blank SEO fields fall back to the post title and excerpt", () => {
  const { blogSearchTitle, blogDescription } = runtime().load("lib/blog.ts");
  assert.equal(
    blogSearchTitle({ seo_title: "   ", title: "Cách thưởng trầm" }),
    "Cách thưởng trầm | Thiên Phúc",
  );
  assert.equal(
    blogDescription({
      seo_description: "   ",
      excerpt: "Hướng dẫn thưởng hương.",
    }),
    "Hướng dẫn thưởng hương.",
  );
});
