import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { WishlistProvider } from '@/components/providers/WishlistProvider';
import { Toaster } from "@/components/ui/sonner";
import ZenHeader from '@/components/zen/ZenHeader'; // Optional: If you want header on auth pages
import "./../../globals.css";

export default async function AuthRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const messages = await getMessages();

    return (
        <html lang="en">
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body className="font-manrope antialiased bg-zen-green-50">
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
