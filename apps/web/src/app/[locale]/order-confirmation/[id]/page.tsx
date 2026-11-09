import { redirect } from 'next/navigation';

// Older links and the English checkout land here; both languages share one success page.
export default async function OrderConfirmationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    redirect(`/${locale}/checkout/success?id=${encodeURIComponent(id)}`);
}
