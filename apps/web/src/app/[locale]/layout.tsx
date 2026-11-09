import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono, Be_Vietnam_Pro, Playfair_Display, Cormorant_Garamond, Montserrat, Manrope } from "next/font/google";
import "./../globals.css";
import "./../atelier.css";
import "./../brand.css";
import "./../legal.css";
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { WishlistProvider } from '@/components/providers/WishlistProvider';
import { NetworkStatusProvider } from '@/components/providers/NetworkStatusProvider';
// import Header from '@/components/layout/Header';
import ZenHeader from '@/components/zen/ZenHeader';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import MotionProvider from '@/components/providers/MotionProvider';
import { Toaster } from "@/components/ui/sonner";
import NextTopLoader from 'nextjs-toploader';
import ChatWidget from '@/components/chat/ChatWidget';
import ScrollToTop from '@/components/layout/ScrollToTop';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LocalFunnelAuth } from '@/components/analytics/LocalFunnelAuth';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import { AnalyticsConsent } from '@/components/analytics/AnalyticsConsent';

const geistSans = Geist({
  preload: false,
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  preload: false,
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
  preload: false,
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-zen-display",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const montserrat = Montserrat({
  preload: false,
  weight: ['100', '200', '300', '400', '500'],
  variable: "--font-zen-sans",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const manrope = Manrope({
  preload: false,
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: "--font-manrope",
  subsets: ["latin", "vietnamese"],
  display: 'swap',
});

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tramhuongthienphuchue.com').replace(/\/+$/, '');

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || `/${locale}`;

  // Clean pathname to remove locale prefix for easier manipulation if needed, 
  // but for canonical we want the full current path.
  // Ensure we have the full URL including domain

  // Logic to generate alternates
  const safePathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  // Remove existing locale prefix to generate alternates
  const pathWithoutLocale = safePathname.replace(new RegExp(`^/${locale}`), '') || '/';

  const siteName = locale === 'vi' ? 'Trầm Hương Thiên Phúc' : 'Thiên Phúc Agarwood';
  const defaultTitle = locale === 'vi' ? 'Thiên Phúc — Trầm hương Việt | Hương Việt. Nếp an yên.' : 'Thiên Phúc — Vietnamese Agarwood';
  const description = locale === 'vi'
    ? 'Trầm hương Thiên Phúc tại Huế. Khám phá hình ảnh, giá bán, phân loại và cách dùng; nhận tư vấn để chọn phẩm trầm phù hợp.'
    : 'Explore Vietnamese agarwood from Thien Phuc in Hue. Browse product photos, prices and options, and get advice before ordering.';

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
      canonical: safePathname,
      languages: {
        'en': `/en${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
        'vi': `/vi${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`,
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
          url: '/brand/social-card.png',
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
      images: ['/brand/social-card.png'],
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
        { url: '/brand/mark.svg', type: 'image/svg+xml' },
        { url: '/brand/icon-32.png', type: 'image/png', sizes: '32x32' },
      ],
      apple: [
        { url: '/brand/icon-180.png', sizes: '180x180' },
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

  // The middleware skips /_next and paths with a dot, so missing files land here as a "locale".
  if (!hasLocale(routing.locales, locale)) notFound();

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
          <AnalyticsProvider>
          <AuthProvider>
            <LocalFunnelAuth />
            <CartProvider>
              <WishlistProvider>
                <NetworkStatusProvider>
                  <ErrorBoundary>
                    <MotionProvider>
                    <JsonLd />
                    {locale !== 'vi' ? <ZenHeader locale={locale} /> : null}
                    {children}
                    <AnalyticsConsent />
                    <ChatWidget />
                    <ScrollToTop />
                    </MotionProvider>
                  </ErrorBoundary>
                </NetworkStatusProvider>
                <Toaster />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
          </AnalyticsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

