import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { WishlistProvider } from '@/components/providers/WishlistProvider';
import { Toaster } from "@/components/ui/sonner";
// import ZenHeader from '@/components/zen/ZenHeader'; // Optional: If you want header on auth pages
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "../globals.css";
import "../brand.css";
import "../typography.css";

export const metadata = {
    title: "Thiên Phúc — Tài khoản",
    icons: { icon: "/brand/mark.svg", apple: "/brand/icon-180.png" },
};

// Same faces as the storefront, so the OAuth error page does not switch typeface.
const beVietnamPro = Be_Vietnam_Pro({
    weight: ['400', '500', '600'],
    variable: "--font-display",
    subsets: ["latin", "vietnamese"],
    display: 'swap',
});
const playfairDisplay = Playfair_Display({
    variable: "--font-serif",
    subsets: ["latin", "vietnamese"],
    display: 'swap',
});

export default async function AuthRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const messages = await getMessages();

    return (
        <html lang="en">
            <body className={`${beVietnamPro.variable} ${playfairDisplay.variable} font-display antialiased bg-zen-green-50`}>
                <NextIntlClientProvider messages={messages}>
                    <AuthProvider>
                        <CartProvider>
                            <WishlistProvider>
                                {children}
                                <Toaster />
                            </WishlistProvider>
                        </CartProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
