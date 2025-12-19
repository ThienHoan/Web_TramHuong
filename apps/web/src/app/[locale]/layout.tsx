import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from "next/font/google";
import "./../globals.css";
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import Header from '@/components/layout/Header';
import { Metadata } from 'next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <CartProvider>
              <Header locale={locale} />
              {children}
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
