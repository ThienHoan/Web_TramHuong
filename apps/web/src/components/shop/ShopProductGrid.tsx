import Image from 'next/image';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import ShopProductCard from './ShopProductCard';
import type { Product } from '@/types/product';

/** The shared four-column shelf. A short shelf ends in an invitation instead of empty columns. */
export default function ShopProductGrid({products,locale,eager=false}:{products:Product[];locale:string;eager?:boolean}) {
  const en=locale!=='vi', t=(vi:string,english:string)=>en?english:vi;
  return <><div className="shop-product-grid" data-product-count={products.length}>
    {products.map((product,index)=><ShopProductCard key={product.id} product={product} wide={products.length===1} eager={eager && index===0}/>)}
    {products.length>0 && products.length<4 && <Link href="/contact" className="shop-shelf-note" data-count={products.length}>
      <Image src="/photos/shelf.webp" alt="" fill sizes="(max-width:767px) 92vw, 70vw"/>
      <span className="shop-shelf-note-copy">
        <strong>{t('Chưa biết chọn loại nào?','Not sure where to start?')}</strong>
        <span>{t('Thiên Phúc sẵn lòng cùng bạn tìm hiểu chất liệu, mùi hương và cách sử dụng trước khi mua.','Ask us about materials, scent and how to use a product before buying.')}</span>
        <span className="tp-text-link">{t('Nhờ tư vấn chọn trầm','Help me choose')}<ArrowUpRight size={16}/></span>
      </span>
    </Link>}
  </div>
    {products.length>0 && products.length<4 && <Link href="/contact" className="shop-mobile-advice"><MessageCircle size={21} aria-hidden="true"/><span>{t('Chưa biết chọn loại nào?','Not sure which to choose?')}<strong>{t('Nhờ Thiên Phúc tư vấn','Ask Thien Phuc for advice')}</strong></span><ArrowUpRight size={19} aria-hidden="true"/></Link>}
  </>;
}
