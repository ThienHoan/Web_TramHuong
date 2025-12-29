import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono, Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./../globals.css";
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { WishlistProvider } from '@/components/providers/WishlistProvider';
import Header from '@/components/layout/Header';
import { Metadata } from 'next';
import SmoothScroll from '@/components/ui/SmoothScroll';
import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from 'nextjs-toploader';

// ... (existing font definitions)

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['300', '400', '500', '600', '700', '900'],
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const siteName = locale === 'vi' ? 'Trầm Hương Web' : 'Agarwood Web';
  const defaultTitle = locale === 'vi' ? 'Trầm Hương Web - Tinh Hoa Đất Trời' : 'Agarwood Web - Zen & Traditional';
  const description = locale === 'vi'
    ? 'Trải nghiệm sự giao thoa giữa Thiền và Truyền Thống. Tinh hoa trầm hương Việt Nam.'
    : 'Experience the dual sensation of Agarwood. Zen minimalism meets Traditional heritage.';

  return {
    metadataBase: new URL(baseUrl),
    title: {
      template: `%s | ${siteName}`,
      default: defaultTitle,
    },
    description: description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'vi': '/vi',
        'x-default': '/en',
      },
    },
    openGraph: {
      siteName: siteName,
      locale: locale,
      type: 'website',
    },
  };
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${beVietnamPro.variable} ${playfairDisplay.variable} antialiased`}
      >
        <NextTopLoader color="var(--color-trad-primary)" showSpinner={false} />
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                {locale !== 'vi' && <Header locale={locale} />}
                <SmoothScroll />
                {children}
                <Toaster position="top-center" toastOptions={{
                  className: 'md:right-4', // Custom class if needed for desktop offset
                  style: { margin: '0 auto' } // Ensure clear centering
                }} closeButton />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
