'use client';
import Image from 'next/image';
import { useRef, useState, type ReactNode, type UIEvent } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProductQuickView } from '@/components/traditional/home/HomeProducts';
import WishlistButton from '@/components/product/WishlistButton';
import { ArrowUpRight, ChevronLeft, ChevronRight, Eye, Star } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import type { Product } from '@/types/product';
import { formatVnd, priceRange, productStock } from '@/lib/commerce';
import { useProductCardAnalytics } from '@/components/analytics/useProductCardAnalytics';

const MAX_PHOTOS = 5;

function CardPhotos({images,title,href,en,linkRef,onSelect,children}: {
  images: string[];
  title: string;
  href: string;
  en: boolean;
  linkRef: (element: HTMLAnchorElement | null) => void;
  onSelect: () => void;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const showPhoto = (index: number) => {
    const element = track.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({left: index * element.clientWidth, behavior: reduced ? 'auto' : 'smooth'});
  };
  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const {scrollLeft, clientWidth} = event.currentTarget;
    const index = Math.round(scrollLeft / clientWidth);
    setActive(index);
    setFurthest(previous => Math.max(previous, index));
  };
  return <div className="shop-product-photo">
    <div className="shop-product-track" ref={track} onScroll={onScroll}>
      {images.map((image,index)=><Link key={`${image}-${index}`} ref={index===0?linkRef:undefined} onClick={onSelect} href={href} className="shop-product-slide" tabIndex={index===active?0:-1} aria-hidden={index===active?undefined:true} aria-label={`${en?'View':'Xem'} ${title}`}>
        {/* Only the next photo is fetched ahead, so a full grid stays light. */}
        {index<=furthest+1 && <Image src={image} alt={index===0?title:''} fill sizes="(max-width:639px) 92vw, (max-width:1023px) 45vw, 440px" />}
      </Link>)}
    </div>
    {images.length>1 && <>
      {active>0 && <button type="button" className="shop-product-nav" data-side="prev" aria-label={en?'Previous photo':'Ảnh trước'} onClick={()=>showPhoto(active-1)}><ChevronLeft size={16} aria-hidden="true"/></button>}
      {active<images.length-1 && <button type="button" className="shop-product-nav" data-side="next" aria-label={en?'Next photo':'Ảnh tiếp theo'} onClick={()=>showPhoto(active+1)}><ChevronRight size={16} aria-hidden="true"/></button>}
      <div className="shop-product-dots" aria-hidden="true">{images.map((image,index)=><span key={`${image}-${index}`} data-active={index===active}/>)}</div>
    </>}
    {children}
  </div>;
}

export default function ShopProductCard({product}: {product: Product}) {
  const locale = useLocale(), en = locale !== 'vi';
  const [quickOpen, setQuickOpen] = useState(false);
  const title = product.translation?.title || product.title || (en ? 'Agarwood' : 'Trầm hương');
  const range = priceRange(product);
  const available = product.variants?.length ? product.variants.some(v => productStock(product,v)>0) : productStock(product)>0;
  const {attachProductLink,selectProduct} = useProductCardAnalytics(product.id,range.min);
  const photos = product.images?.length ? product.images.slice(0,MAX_PHOTOS) : ['/placeholder.png'];
  return <article className="shop-product-card">
    <div className="shop-product-photo-wrap"><CardPhotos images={photos} title={title} href={`/products/${product.slug}`} en={en} linkRef={attachProductLink} onSelect={selectProduct}>
      {!available && <span className="shop-product-stock">{en?'Currently unavailable':'Tạm hết hàng'}</span>}
    </CardPhotos><WishlistButton productId={product.id} className="shop-product-wishlist"/><button type="button" className="shop-product-quick" title={en?'Quick view':'Xem nhanh'} aria-label={`${en?'Quick view':'Xem nhanh'} ${title}`} onClick={()=>{selectProduct();setQuickOpen(true);}}><Eye aria-hidden="true"/></button></div>
    <p className="shop-product-category">{product.category?.translation?.name || 'Thiên Phúc'}</p>
    <h3><Link href={`/products/${product.slug}`} onClick={selectProduct}>{title}</Link></h3>
    {product.translation?.short_description && <p className="shop-product-description">{product.translation.short_description}</p>}
    <p className="shop-product-price">{range.max>range.min && <span>{en?'From ':'Từ '}</span>}{formatVnd(range.min,locale)}</p>
    {(product.review_count || 0)>0 && <p className="shop-product-rating"><Star size={13} fill="currentColor" />{Number(product.rating_average || 0).toFixed(1)} <span>({product.review_count})</span></p>}
    <Link className="shop-product-link tp-text-link" href={`/products/${product.slug}`} onClick={selectProduct}>{product.variants?.length ? (en?'Choose options':'Chọn phân loại') : (en?'View product':'Xem sản phẩm')}<ArrowUpRight size={15}/></Link>
    <Dialog open={quickOpen} onOpenChange={setQuickOpen}><DialogContent className="tp-quick-view">{quickOpen && <ProductQuickView product={product} onClose={()=>setQuickOpen(false)}/>}</DialogContent></Dialog>
  </article>;
}
