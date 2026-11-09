import type { Product } from '@/types/product';
import { discountPrice, productStock, variantKey, firstAvailableVariant } from '@/lib/commerce';
import { absoluteUrl } from '@/lib/seo';

export default function ProductJsonLd({product,locale='vi',variantIndex=firstAvailableVariant(product)}:{product:Product;locale?:string;variantIndex?:number}) {
  const variant=product.variants?.[variantIndex];
  const path=`/${locale}/products/${product.slug}`;
  const schema:Record<string,unknown>={
    '@context':'https://schema.org','@type':'Product','@id':`${absoluteUrl(path)}#product`,
    name:product.translation?.title || product.title,
    description:product.translation?.description || product.description,
    image:(product.images?.length?product.images:['/placeholder.png']).map(absoluteUrl),
    brand:{'@type':'Brand',name:'Thiên Phúc'},sku:variant?.sku || product.id,
    offers:{'@type':'Offer',url:absoluteUrl(`${path}${variant?`?variant=${encodeURIComponent(variantKey(variant,variantIndex))}`:''}`),priceCurrency:'VND',price:discountPrice(product,variant?Number(variant.price):Number(product.price)),availability:product.is_active!==false&&productStock(product,variant)>0?'https://schema.org/InStock':'https://schema.org/OutOfStock',itemCondition:'https://schema.org/NewCondition',seller:{'@id':absoluteUrl('/#store')}}
  };
  if(Number(product.review_count)>0 && Number(product.rating_average)>0) schema.aggregateRating={'@type':'AggregateRating',ratingValue:Number(product.rating_average),reviewCount:Number(product.review_count)};
  // Delivery and return commitments are omitted until the seller approves them.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>;
}
