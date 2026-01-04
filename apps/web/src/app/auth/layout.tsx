import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { WishlistProvider } from '@/components/providers/WishlistProvider';
import { Toaster } from "@/components/ui/sonner";
import ZenHeader from '@/components/zen/ZenHeader'; // Optional: If you want header on auth pages
import { Manrope } from "next/font/google";
import "../globals.css";

const manrope = Manrope({
    weight: ['200', '300', '400', '500', '600', '700', '800'],
    variable: "--font-manrope",
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
            <body className={`${manrope.variable} font-manrope antialiased bg-zen-green-50`}>
                <NextIntlClientProvider messages={messages}>
                    <AuthProvider>
                        <CartProvider>
                            <WishlistProvider>
                                {children}
                                <Toaster position="top-center" closeButton />
                            </WishlistProvider>
                        </CartProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
