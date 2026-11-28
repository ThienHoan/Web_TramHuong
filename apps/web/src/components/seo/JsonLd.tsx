import React from 'react';
import { SHOP_CONTACT } from '@/lib/legal';
import { SITE_URL } from '@/lib/seo';

const JsonLd = () => {
    const baseUrl = SITE_URL;

    // Using @graph to link entities
    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                '@id': `${baseUrl}/#website`,
                'url': baseUrl,
                'name': 'Trầm Hương Thiên Phúc',
                'alternateName': ['Thien Phuc Agarwood', 'Thiên Phúc', 'Thien Phuc'],
                'description': 'Tinh Hoa Trầm Hương Việt Nam - The Essence of Vietnamese Agarwood',
                'publisher': {
                    '@id': `${baseUrl}/#store`
                }
                // No SearchAction: Google retired the sitelinks search box in 2024, and its
                // crawler was fetching the literal "?search={search_term_string}" template.
            },
            {
                '@type': 'Store', // More specific than LocalBusiness
                '@id': `${baseUrl}/#store`,
                'name': 'Trầm Hương Thiên Phúc',
                'url': baseUrl,
                'image': [
                    `${baseUrl}/brand/social-card.png` // Fallback, effectively the store image
                ],
                'logo': {
                    '@type': 'ImageObject',
                    'url': `${baseUrl}/brand/icon-512.png`,
                    'width': 512,
                    'height': 512
                },
                'telephone': '+84' + SHOP_CONTACT.phone.slice(1), // Int'l format
                'priceRange': '$$',
                'address': {
                    '@type': 'PostalAddress',
                    'streetAddress': SHOP_CONTACT.address,
                    'addressLocality': 'Thành phố Huế',
                    'addressRegion': 'Thành phố Huế',
                    'addressCountry': 'VN'
                },
                'openingHoursSpecification': [
                    {
                        '@type': 'OpeningHoursSpecification',
                        'dayOfWeek': [
                            'Monday',
                            'Tuesday',
                            'Wednesday',
                            'Thursday',
                            'Friday',
                            'Saturday',
                            'Sunday'
                        ],
                        'opens': '08:00',
                        'closes': '21:00'
                    }
                ],
                'sameAs': [
                    SHOP_CONTACT.facebookUrl,
                ],
                'contactPoint': {
                    '@type': 'ContactPoint',
                    'telephone': '+84-356-176-878',
                    'contactType': 'customer service',
                    'areaServed': ['VN'],
                    'availableLanguage': ['Vietnamese', 'English']
                }
            }
        ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
    );
};

export default JsonLd;
