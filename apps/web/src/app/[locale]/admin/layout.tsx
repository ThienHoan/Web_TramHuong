'use client';

import { Link } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { use } from 'react';

export default function AdminLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = use(params);
    const pathname = usePathname();

    const tabs = [
        { name: 'Orders', href: '/admin/dashboard' },
        { name: 'Products', href: '/admin/products' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pt-20 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 border-b flex gap-6">
                    {tabs.map(tab => {
                        const isActive = pathname.includes(tab.href);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`pb-2 text-sm font-medium transition-colors ${isActive
                                    ? 'border-b-2 border-black text-black'
                                    : 'text-gray-500 hover:text-black'
                                    }`}
                            >
                                {tab.name}
                            </Link>
                        );
                    })}
                </div>
                {children}
            </div>
        </div>
    );
}
