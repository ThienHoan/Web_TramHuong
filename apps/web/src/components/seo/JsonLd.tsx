import React from 'react';

const JsonLd = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tramhuongthienphuchue.com';

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
                },
                'potentialAction': {
                    '@type': 'SearchAction',
                    'target': `${baseUrl}/search?q={search_term_string}`,
                    'query-input': 'required name=search_term_string'
                }
            },
            {
                '@type': 'Store', // More specific than LocalBusiness
                '@id': `${baseUrl}/#store`,
                'name': 'Trầm Hương Thiên Phúc',
                'url': baseUrl,
                'image': [
                    `${baseUrl}/og-image.jpg` // Fallback, effectively the store image
                ],
                'logo': {
                    '@type': 'ImageObject',
                    'url': `${baseUrl}/favicon.ico`,
                    'width': 512,
                    'height': 512
                },
                'telephone': '+84356176878', // Int'l format
                'priceRange': '$$',
                'address': {
                    '@type': 'PostalAddress',
                    'streetAddress': '153 Lý Thái Tổ, Hương Trà',
                    'addressLocality': 'Thành Phố Huế',
                    'addressRegion': 'Thừa Thiên Huế',
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
                    'https://www.facebook.com/tramhuongthienphuc',
                ],
                'contactPoint': {
                    '@type': 'ContactPoint',
                    'telephone': '+84-356-176-878',
                    'contactType': 'customer service',
                    'areaServed': ['VN', 'US', 'JP'],
                    'availableLanguage': ['Vietnamese', 'English']
                }
            }
        ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

export default JsonLd;
