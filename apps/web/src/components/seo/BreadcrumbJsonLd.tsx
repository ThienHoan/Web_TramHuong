import React from 'react';
import { getLocale } from 'next-intl/server';
import { absoluteUrl } from '@/lib/seo';

interface BreadcrumbItem {
    name: string;
    item: string;
}

interface BreadcrumbJsonLdProps {
    items: BreadcrumbItem[];
    locale?: string;
}

const BreadcrumbJsonLd = async ({ items, locale: requestedLocale }: BreadcrumbJsonLdProps) => {
    const locale = requestedLocale || await getLocale();


    const breadcrumbList = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': items.map((crumb, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': crumb.name,
            'item': absoluteUrl(crumb.item.startsWith('http') || /^\/(vi|en)(\/|$)/.test(crumb.item) ? crumb.item : `/${locale}${crumb.item === '/' ? '' : crumb.item}`)
        }))
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList).replace(/</g, '\\u003c') }}
        />
    );
};

export default BreadcrumbJsonLd;
