import TraditionalHome from "@/components/traditional/TraditionalHome";
import { getProducts } from "@/lib/api-client";

export default async function ExplicitTraditionalPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const products = await getProducts(locale);
    return <TraditionalHome products={products} />;
}
