import ZenHome from "@/components/zen/ZenHome";
import { getProducts } from "@/lib/api-client";

export default async function ExplicitZenPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const products = await getProducts(locale);
    return <ZenHome products={products} />;
}
