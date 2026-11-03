export function productThumbnail(source: string): string {
  try {
    const url = new URL(source);
    const storage = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://invalid.local",
    );
    if (
      url.origin === storage.origin &&
      url.pathname.includes(
        "/storage/v1/object/public/product-images/products/optimized/",
      ) &&
      url.pathname.endsWith(".webp") &&
      !url.pathname.endsWith("-thumb.webp")
    )
      url.pathname = url.pathname.replace(/\.webp$/, "-thumb.webp");
    return url.toString();
  } catch {
    return source;
  }
}
