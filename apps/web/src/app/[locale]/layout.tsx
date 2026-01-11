import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono, Be_Vietnam_Pro, Playfair_Display, Cormorant_Garamond, Montserrat, Manrope } from "next/font/google";
import "./../globals.css";
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { WishlistProvider } from '@/components/providers/WishlistProvider';
import { NetworkStatusProvider } from '@/components/providers/NetworkStatusProvider';
// import Header from '@/components/layout/Header';
import ZenHeader from '@/components/zen/ZenHeader';
import { Metadata } from 'next';
import SmoothScroll from '@/components/ui/SmoothScroll';
import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from 'nextjs-toploader';
import ChatWidget from '@/components/chat/ChatWidget';
import ScrollToTop from '@/components/layout/ScrollToTop';
import ErrorBoundary from '@/components/ErrorBoundary';

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

const cormorantGaramond = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-zen-display",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const montserrat = Montserrat({
  weight: ['100', '200', '300', '400', '500'],
  variable: "--font-zen-sans",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const manrope = Manrope({
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: "--font-manrope",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  const siteName = locale === 'vi' ? 'Trầm Hương Thiên Phúc' : 'Thien Phuc Agarwood';
  const defaultTitle = locale === 'vi' ? 'Trầm Hương Thiên Phúc - Tinh Hoa Đất Trời' : 'Thien Phuc Agarwood - Zen & Traditional';
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
    keywords: locale === 'vi'
      ? ['trầm hương', 'nhang trầm', 'thưởng trầm', 'thiền', 'quà tặng trầm hương', 'vòng tay trầm hương', 'trầm hương thiên phúc']
      : ['agarwood', 'oud', 'incense', 'zen', 'meditation', 'luxury incense', 'thien phuc agarwood'],
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'vi': '/vi',
        'x-default': '/en',
      },
    },
    openGraph: {
      title: defaultTitle,
      description: description,
      url: baseUrl,
      siteName: siteName,
      locale: locale,
      type: 'website',
      images: [
        {
          url: '/og-image.jpg', // Ensure you have a default OG image at public/og-image.jpg or similar
          width: 1200,
          height: 630,
          alt: siteName,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: description,
      // images: ['/twitter-image.jpg'], // Optional
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/icon.png', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-icon.png' },
      ],
    },
  };
}

// Import JsonLd component
import JsonLd from '@/components/seo/JsonLd';

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let messages;
  try {
    messages = await getMessages();
  } catch (error) {
    console.error('Failed to load messages:', error);
    messages = {};
  }

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${beVietnamPro.variable} ${playfairDisplay.variable} ${cormorantGaramond.variable} ${montserrat.variable} ${manrope.variable} antialiased`}
      >
        <NextTopLoader color="var(--color-trad-primary)" showSpinner={false} />
        <NextIntlClientProvider messages={messages} locale={locale} timeZone="Asia/Ho_Chi_Minh">
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <NetworkStatusProvider>
                  <ErrorBoundary>
                    <JsonLd />
                    {locale !== 'vi' ? <ZenHeader locale={locale} /> : null}
                    <SmoothScroll />
                    {children}
                    <ChatWidget />
                    <ScrollToTop />
                  </ErrorBoundary>
                </NetworkStatusProvider>
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

