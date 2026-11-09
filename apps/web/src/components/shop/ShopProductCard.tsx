'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProductQuickView } from '@/components/traditional/home/HomeProducts';
import WishlistButton from '@/components/product/WishlistButton';
import { ArrowUpRight, Eye, Star } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import type { Product } from '@/types/product';
import { formatVnd, priceRange, productStock } from '@/lib/commerce';
import { useProductCardAnalytics } from '@/components/analytics/useProductCardAnalytics';

export default function ShopProductCard({product}: {product: Product}) {
  const locale = useLocale(), en = locale !== 'vi';
  const [quickOpen, setQuickOpen] = useState(false);
  const title = product.translation?.title || product.title || (en ? 'Agarwood' : 'Trầm hương');
  const range = priceRange(product);
  const available = product.variants?.length ? product.variants.some(v => productStock(product,v)>0) : productStock(product)>0;
  const {attachProductLink,selectProduct} = useProductCardAnalytics(product.id,range.min);
  return <article className="shop-product-card">
    <div className="shop-product-photo-wrap"><Link ref={attachProductLink} onClick={selectProduct} href={`/products/${product.slug}`} className="shop-product-photo" aria-label={`${en?'View':'Xem'} ${title}`}>
      <Image src={product.images?.[0] || '/placeholder.png'} alt={title} fill sizes="(max-width:639px) 46vw, (max-width:1023px) 30vw, 23vw" />
      {!available && <span className="shop-product-stock">{en?'Currently unavailable':'Tạm hết hàng'}</span>}
    </Link><WishlistButton productId={product.id} className="shop-product-wishlist"/><button type="button" className="shop-product-quick" aria-label={`${en?'Quick view':'Xem nhanh'} ${title}`} onClick={()=>{selectProduct();setQuickOpen(true);}}><Eye size={16} aria-hidden="true"/><span>{en?'Quick view':'Xem nhanh'}</span></button></div>
    <p className="shop-product-category">{product.category?.translation?.name || 'Thiên Phúc'}</p>
    <h3><Link href={`/products/${product.slug}`} onClick={selectProduct}>{title}</Link></h3>
    {product.translation?.short_description && <p className="shop-product-description">{product.translation.short_description}</p>}
    <p className="shop-product-price">{range.max>range.min && <span>{en?'From ':'Từ '}</span>}{formatVnd(range.min,locale)}</p>
    {(product.review_count || 0)>0 && <p className="shop-product-rating"><Star size={13} fill="currentColor" />{Number(product.rating_average || 0).toFixed(1)} <span>({product.review_count})</span></p>}
    <Link className="shop-product-link tp-text-link" href={`/products/${product.slug}`} onClick={selectProduct}>{product.variants?.length ? (en?'Choose options':'Chọn phân loại') : (en?'View product':'Xem sản phẩm')}<ArrowUpRight size={15}/></Link>
    <Dialog open={quickOpen} onOpenChange={setQuickOpen}><DialogContent className="tp-quick-view">{quickOpen && <ProductQuickView product={product} onClose={()=>setQuickOpen(false)}/>}</DialogContent></Dialog>
  </article>;
}
