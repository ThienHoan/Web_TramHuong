import { Product } from '@/types/product';
import React from 'react';

// Using a custom type or simpler object to avoid complex typing for schema
const ProductJsonLd = ({ product }: { product: Product }) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tramhuongthienphuchue.com';
    const productUrl = `${baseUrl}/products/${product.slug}`;
    const productImageUrl = product.images?.[0] || `${baseUrl}/og-image.jpg`;

    // Calculate price validity (e.g., 1 year from now)
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    // Calculate shipping fee: Free if price >= 300,000 VND, else 30,000 VND (standard estimate)
    // Reuse this logic helper
    const getShippingFee = (price: number) => price >= 300000 ? 0 : 30000;

    // Common Merchant Data
    const merchantReturnPolicy = {
        '@type': 'MerchantReturnPolicy',
        'applicableCountry': 'VN',
        'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
        'merchantReturnDays': 3,
        'returnMethod': 'https://schema.org/ReturnByMail',
        'returnFees': 'https://schema.org/MerchantReturnFees'
    };

    const shippingDetails = (price: number) => ({
        '@type': 'OfferShippingDetails',
        'shippingDestination': {
            '@type': 'DefinedRegion',
            'addressCountry': 'VN'
        },
        'deliveryTime': {
            '@type': 'ShippingDeliveryTime',
            'handlingTime': {
                '@type': 'QuantitativeValue',
                'minValue': 1,
                'maxValue': 3,
                'unitCode': 'd'
            },
            'transitTime': {
                '@type': 'QuantitativeValue',
                'minValue': 2,
                'maxValue': 5,
                'unitCode': 'd'
            }
        },
        'shippingRate': {
            '@type': 'MonetaryAmount',
            'value': getShippingFee(price),
            'currency': 'VND'
        }
    });

    const baseProductSchema = {
        name: product.translation?.title || product.title,
        image: product.images || [productImageUrl],
        description: product.translation?.description || product.description,
        brand: {
            '@type': 'Brand',
            name: 'Trầm Hương Thiên Phúc'
        },
        sku: product.id,
    };

    let schema: Record<string, unknown>;

    if (product.variants && product.variants.length > 0) {
        // ProductGroup Schema for Variants
        schema = {
            '@context': 'https://schema.org',
            '@type': 'ProductGroup',
            ...baseProductSchema,
            productGroupID: product.id,
            variesBy: ['size', 'material'], // Generic fallback, strictly should come from attributes keys
            hasVariant: product.variants.map(variant => {
                const variantPrice = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price;
                return {
                    '@type': 'Product',
                    image: product.images || [productImageUrl], // Variant specific image if available
                    description: baseProductSchema.description,
                    sku: variant.sku,
                    name: `${baseProductSchema.name} - ${variant.name || variant.sku}`,
                    offers: {
                        '@type': 'Offer',
                        url: `${baseUrl}/products/${product.slug}?variant=${variant.id}`, // specific URL
                        priceCurrency: 'VND',
                        price: variantPrice,
                        availability: variant.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                        itemCondition: 'https://schema.org/NewCondition',
                        priceValidUntil: validUntil.toISOString().split('T')[0],
                        hasMerchantReturnPolicy: merchantReturnPolicy,
                        shippingDetails: shippingDetails(variantPrice)
                    }
                };
            })
        };
    } else {
        // Single Product Schema
        const price = product.sale_price || product.price || 0;
        schema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            ...baseProductSchema,
            offers: {
                '@type': 'Offer',
                url: productUrl,
                priceCurrency: 'VND',
                price: price,
                availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                itemCondition: 'https://schema.org/NewCondition',
                priceValidUntil: validUntil.toISOString().split('T')[0],
                hasMerchantReturnPolicy: merchantReturnPolicy,
                shippingDetails: shippingDetails(price)
            },
        };
    }

    // Conditionally add rating if available and valid
    if (product.rating_average && product.review_count && product.rating_average > 0 && product.review_count > 0) {
        schema['aggregateRating'] = {
            '@type': 'AggregateRating',
            ratingValue: product.rating_average,
            reviewCount: product.review_count
        };
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

export default ProductJsonLd;
