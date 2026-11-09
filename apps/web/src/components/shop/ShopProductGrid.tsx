import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import ShopProductCard from './ShopProductCard';
import type { Product } from '@/types/product';

/** The shared four-column shelf. A short shelf ends in an invitation instead of empty columns. */
export default function ShopProductGrid({products,locale}:{products:Product[];locale:string}) {
  const en=locale!=='vi', t=(vi:string,english:string)=>en?english:vi;
  return <div className="shop-product-grid">
    {products.map(product=><ShopProductCard key={product.id} product={product}/>)}
    {products.length>0 && products.length<4 && <Link href="/contact" className="shop-shelf-note" data-count={products.length}>
      <Image src="/editorial/ritual.webp" alt="" fill sizes="(max-width:767px) 92vw, 70vw"/>
      <span className="shop-shelf-note-copy">
        <strong>{t('Chưa biết chọn loại nào?','Not sure where to start?')}</strong>
        <span>{t('Thiên Phúc sẵn lòng cùng bạn tìm hiểu chất liệu, mùi hương và cách sử dụng trước khi mua.','Ask us about materials, scent and how to use a product before buying.')}</span>
        <span className="tp-text-link">{t('Nhờ tư vấn chọn trầm','Help me choose')}<ArrowUpRight size={16}/></span>
      </span>
    </Link>}
  </div>;
}
