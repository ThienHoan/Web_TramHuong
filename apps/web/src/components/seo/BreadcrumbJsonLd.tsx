import React from 'react';

interface BreadcrumbItem {
    name: string;
    item: string;
}

interface BreadcrumbJsonLdProps {
    items: BreadcrumbItem[];
}

const BreadcrumbJsonLd = ({ items }: BreadcrumbJsonLdProps) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tramhuongthienphuchue.com';

    const breadcrumbList = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': items.map((crumb, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': crumb.name,
            'item': crumb.item.startsWith('http') ? crumb.item : `${baseUrl}${crumb.item === '/' ? '' : crumb.item}`
        }))
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
        />
    );
};

export default BreadcrumbJsonLd;
