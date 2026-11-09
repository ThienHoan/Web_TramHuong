'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Minus, Phone, Plus, ShoppingBag, Truck, UserRound, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/routing';
import { useCart } from '@/components/providers/CartProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { useAnalyticsView } from '@/components/analytics/AnalyticsProvider';
import ProductJsonLd from '@/components/seo/ProductJsonLd';
import { useProductDiscount } from '@/hooks/useProductDiscount';
import { ProductPrice } from '@/components/ui/ProductPrice';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import ZenFooter from '@/components/zen/ZenFooter';
import TraditionalProductReviews from './TraditionalProductReviews';
import ShopProductCard from '@/components/shop/ShopProductCard';
import { getReviews } from '@/lib/api-client';
import { firstAvailableVariant, formatVnd, productStock, specifications, variantKey } from '@/lib/commerce';
import { SHOP_CONTACT } from '@/lib/legal';
import { takeSentence, USAGE_GUIDES } from '@/lib/product-story';
import type { Product } from '@/types/product';
import type { ReviewResponse } from '@/types/review';
import './product-detail.css';
import '@/components/shop/shop.css';

type Props = { product:Product; relatedProducts?:Product[]; initialReviews?:ReviewResponse; initialVariantIndex?:number };
export default function TraditionalProductDetail({product,relatedProducts=[],initialReviews,initialVariantIndex}:Props) {
  const locale=useLocale(), en=locale!=='vi', t=(vi:string,english:string)=>en?english:vi;
  const router=useRouter();
  const {addItem,items}=useCart();
  const {items:wishlistItems,toggle:toggleWishlist}=useWishlist();
  const [selectedImage,setSelectedImage]=useState(product.images?.[0] || '/placeholder.png');
  const [zoomOpen,setZoomOpen]=useState(false);
  const [quantity,setQuantity]=useState(1);
  const [reviewStats,setReviewStats]=useState(initialReviews?.meta || {average:0,total:0,distribution:{}});
  const [selectedVariantIndex,setSelectedVariantIndex]=useState(initialVariantIndex ?? firstAvailableVariant(product));
  const variant=product.variants?.[selectedVariantIndex] || null;
  const key=variant?variantKey(variant,selectedVariantIndex):undefined;
  const {finalPrice,originalPrice,savings}=useProductDiscount(product,variant?Number(variant.price):undefined);
  const stock=productStock(product,variant);
  const inCart=items.filter(i=>i.productId===product.id && (i.variantId||'')===(key||'')).reduce((sum,i)=>sum+i.quantity,0);
  const parentInCart=items.filter(i=>i.productId===product.id).reduce((sum,i)=>sum+i.quantity,0);
  const remaining=Math.max(0,Math.min(stock-inCart,productStock(product)-parentInCart)), available=product.is_active!==false && remaining>0;
  const selectedQuantity=Math.min(quantity,Math.max(1,remaining));
  const [pending,setPending]=useState<'cart'|'buy'|null>(null);
  const [showBuyBar,setShowBuyBar]=useState(false);
  const purchase=useRef<HTMLDivElement>(null);
  const title=product.translation?.title || product.title || t('Trầm hương Thiên Phúc','Thien Phuc Agarwood');
  const images=product.images?.length?product.images:['/placeholder.png'];
  const description=product.translation?.description || product.description || '';
  const specs=specifications(product.translation?.specifications);
  const story=product.translation?.story;
  const guide=USAGE_GUIDES[product.category?.slug || ''];
  // The description reads on from the buy panel into the story band, so no sentence appears twice.
  const shortDescription=product.translation?.short_description?.trim();
  const [firstSentence,afterFirst]=takeSentence(description);
  const intro=shortDescription || firstSentence;
  const [storyLead,storyBody]=shortDescription?[firstSentence,afterFirst]:takeSentence(afterFirst);
  useAnalyticsView('view_item',{items:[{item_id:product.id,price:finalPrice,quantity:1,...(variant?{item_variant:`variant_${selectedVariantIndex}`}:{})}]});
  useEffect(()=>{
    let frame=0;
    const schedule=()=>{
      if(frame)return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        setShowBuyBar(!!purchase.current && purchase.current.getBoundingClientRect().bottom<0);
      });
    };
    schedule();
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    return()=>{window.cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  },[]);
  const selectVariant=(index:number)=>{
    setSelectedVariantIndex(index);setQuantity(1);
    const url=new URL(window.location.href);url.searchParams.set('variant',variantKey(product.variants![index],index));
    window.history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`);
  };
  const add=async(mode:'cart'|'buy')=>{
    if(pending || !available) return;
    setPending(mode);
    try {
      await addItem({id:product.id,slug:product.slug,title,price:finalPrice,original_price:originalPrice,discount_amount:savings,image:images[0],quantity:selectedQuantity,variantId:key,variantName:variant?.name});
      if(mode==='buy') router.push('/checkout');
      else toast.success(t('Đã thêm vào giỏ hàng','Added to your cart'),{description:title,action:{label:t('Thanh toán','Checkout'),onClick:()=>router.push('/checkout')}});
    } catch {toast.error(t('Chưa thể thêm sản phẩm. Vui lòng thử lại.','Could not add this item. Please try again.'));}
    finally {setPending(null);}
  };
  const scrollToReviews=()=>document.getElementById('product-reviews')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  const changeImage=(delta:number)=>setSelectedImage(images[(images.indexOf(selectedImage)+delta+images.length)%images.length]);
  const openImage=(image:string)=>{setSelectedImage(image);setZoomOpen(true);};
  const fullWidthTile=(index:number)=>index===0 || (index===images.length-1 && index%2===1);
  const buyLabel=pending==='buy'?t('Đang chuyển…','Continuing…'):available?t('Mua ngay','Buy now'):stock>0?t('Đã có đủ trong giỏ','Already in your cart'):t('Tạm hết hàng','Currently unavailable');
  return <div className={`tp-product-detail pd-page ${en?'shop-commerce-en':''}`}>
    <ProductJsonLd product={{...product,rating_average:Number(reviewStats.average),review_count:reviewStats.total}} locale={locale} variantIndex={selectedVariantIndex}/>
    {!en && <TraditionalHeader/>}
    <Dialog open={zoomOpen} onOpenChange={setZoomOpen}><DialogContent className="tp-image-dialog"><DialogTitle className="sr-only">{title}</DialogTitle><DialogDescription className="sr-only">{t('Ảnh phóng lớn. Nhấn Escape để đóng.','Enlarged product image. Press Escape to close.')}</DialogDescription><div className="tp-image-zoom"><Image src={selectedImage} alt={title} fill sizes="(max-width:767px) 95vw, 900px" className="object-contain"/></div>{images.length>1 && <div className="tp-image-controls"><button type="button" aria-label={t('Ảnh trước','Previous image')} onClick={()=>changeImage(-1)}><ArrowLeft size={20}/></button><span>{images.indexOf(selectedImage)+1} / {images.length}</span><button type="button" aria-label={t('Ảnh tiếp theo','Next image')} onClick={()=>changeImage(1)}><ArrowRight size={20}/></button></div>}</DialogContent></Dialog>
    <main>
      <div className="pd-container">
        <nav aria-label={t('Đường dẫn','Breadcrumb')} className="pd-breadcrumb"><Link href="/">{t('Trang chủ','Home')}</Link><span>/</span><Link href="/products">{t('Sản phẩm','Products')}</Link><span>/</span><span aria-current="page">{title}</span></nav>
        <div className="pd-hero">
          <div className="pd-gallery-wrap">
            <section className="pd-gallery" aria-label={t('Hình ảnh sản phẩm','Product images')}>
              {images.map((image,index)=><button type="button" className="pd-tile" key={`${image}-${index}`} aria-label={t(`Phóng to ảnh sản phẩm ${index+1}`,`Enlarge product image ${index+1}`)} onClick={()=>openImage(image)}><Image src={image} alt={index===0?title:`${title} - ${t('ảnh','photo')} ${index+1}`} fill priority={index===0} sizes={fullWidthTile(index)?'(max-width:1023px) 90vw, 760px':'(max-width:1023px) 90vw, 380px'} className="object-cover"/><span className="pd-tile-zoom" aria-hidden="true"><ZoomIn size={18}/></span></button>)}
            </section>
            {images.length>1 && <p className="pd-gallery-hint">{t(`${images.length} ảnh · Vuốt để xem thêm`,`${images.length} photos · Swipe to see more`)}</p>}
          </div>
          <section className="pd-summary" aria-labelledby="product-title">
            <div className="pd-summary-top"><p className="pd-eyebrow">{product.category?.translation?.name || t('Tuyển chọn Thiên Phúc','Thien Phuc collection')}</p><button type="button" aria-pressed={wishlistItems.has(product.id)} aria-label={t('Lưu sản phẩm yêu thích','Save to wishlist')} className="pd-wishlist" onClick={()=>toggleWishlist(product.id)}><Heart size={20} fill={wishlistItems.has(product.id)?'currentColor':'none'}/></button></div>
            <h1 id="product-title">{title}</h1>
            <button className="pd-rating" type="button" onClick={scrollToReviews}>{reviewStats.total>0?<><span className="pd-stars">★ <strong>{Number(reviewStats.average).toFixed(1)}</strong></span><span>· {reviewStats.total} {t('đánh giá','reviews')}</span></>:t('Chưa có đánh giá · Chia sẻ cảm nhận','No reviews yet · Share your experience')}<ArrowUpRight size={15}/></button>
            <div className="pd-price-row"><div className="pd-price"><ProductPrice product={product} variantPrice={variant?Number(variant.price):undefined} size="xl" theme="traditional"/></div><p className="pd-availability" data-available={stock>0}>{stock>0?t('Còn hàng','In stock'):t('Tạm hết hàng','Currently unavailable')}</p></div>
            {intro && <p className="pd-intro">{intro}</p>}
            {specs.length>0 && <dl className="pd-key-facts">{specs.slice(0,3).map((spec,index)=><div key={index}><dt>{spec.key || t('Chi tiết','Detail')}</dt><dd>{spec.value}</dd></div>)}</dl>}
            <div className="pd-purchase" ref={purchase}>
              {!!product.variants?.length && <fieldset className="pd-variants"><legend>{t('Chọn phân loại','Choose your option')} <span>/ {variant?.name || variant?.sku}</span></legend><div>{product.variants.map((v,index)=><label key={index}><input type="radio" name="variant" checked={index===selectedVariantIndex} onChange={()=>selectVariant(index)}/><span>{v.name || v.sku || `${t('Loại','Option')} ${index+1}`}{productStock(product,v)<=0?` · ${t('Hết hàng','Sold out')}`:''}</span></label>)}</div></fieldset>}
              <div className="pd-buy">
                <div className="pd-quantity" role="group" aria-label={t('Số lượng','Quantity')}><button type="button" aria-label={t('Giảm số lượng','Decrease quantity')} disabled={selectedQuantity<=1||!available} onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={17}/></button><output aria-live="polite">{selectedQuantity}</output><button type="button" aria-label={t('Tăng số lượng','Increase quantity')} disabled={!available||selectedQuantity>=remaining} onClick={()=>setQuantity(q=>Math.min(remaining,q+1))}><Plus size={17}/></button></div>
                <button type="button" className="shop-btn shop-btn-secondary" disabled={!available||!!pending} onClick={()=>add('cart')}><ShoppingBag size={18}/>{pending==='cart'?t('Đang thêm…','Adding…'):t('Thêm vào giỏ','Add to cart')}</button>
                <button type="button" className="shop-btn pd-buy-now" disabled={!available||!!pending} onClick={()=>add('buy')}>{buyLabel}<ArrowRight size={18}/></button>
              </div>
              {inCart>0 && <p className="pd-in-cart">{t(`Đã có ${inCart} sản phẩm này trong giỏ.`,`You have ${inCart} of this item in your cart.`)} <Link href="/checkout">{t('Xem đơn hàng','Review order')}</Link></p>}
            </div>
            <ul className="pd-assurance">
              <li><Truck size={18} aria-hidden="true"/><span>{t('Biết rõ phí giao và tổng tiền trước khi đặt','See delivery costs and the total before ordering')}</span></li>
              <li><UserRound size={18} aria-hidden="true"/><span>{t('Đặt hàng không cần tạo tài khoản','Check out without creating an account')}</span></li>
              <li><Phone size={18} aria-hidden="true"/><span>{t('Cần tư vấn? Gọi ','Need advice? Call ')}<a href={`tel:${SHOP_CONTACT.phone}`}>{SHOP_CONTACT.phone}</a></span></li>
            </ul>
            <p className="pd-policy-links"><Link href="/policies/shipping">{t('Giao hàng & thanh toán','Delivery & payment')}</Link><Link href="/policies/returns">{t('Đổi trả & hỗ trợ','Returns & support')}</Link></p>
          </section>
        </div>
      </div>
      {storyLead && <section className="pd-story" aria-labelledby="pd-story-heading"><div className="pd-container pd-story-inner"><figure className="pd-story-photo"><Image src={images[1] || images[0]} alt="" fill sizes="(max-width:1023px) 92vw, 720px" className="object-cover"/></figure><div><h2 className="pd-eyebrow" id="pd-story-heading">{t('Về sản phẩm','About this product')}</h2><p className="pd-story-lead">{storyLead}</p>{storyBody && <p className="pd-story-body">{storyBody}</p>}</div></div></section>}
      {story && <section className="pd-feature" aria-labelledby="pd-tale-heading"><div className="pd-container pd-feature-inner"><div><h2 className="pd-eyebrow" id="pd-tale-heading">{t('Câu chuyện sản phẩm','The product story')}</h2><p className="pd-feature-text">{story}</p></div><figure className="pd-story-photo"><Image src={images[3] || images[0]} alt="" fill sizes="(max-width:1023px) 92vw, 720px" className="object-cover"/></figure></div></section>}
      {guide && <section className="pd-feature" aria-labelledby="pd-guide-heading"><div className="pd-container pd-feature-inner"><div><h2 className="pd-eyebrow" id="pd-guide-heading">{t('Cách dùng','How to use')}</h2><p className="pd-feature-title">{en?guide.title.en:guide.title.vi}</p><ol className="pd-steps">{guide.steps.map((step,index)=><li key={index}><span aria-hidden="true">{index+1}</span><div><h3>{en?step.title.en:step.title.vi}</h3><p>{en?step.body.en:step.body.vi}</p></div></li>)}</ol><p className="pd-steps-note">{en?guide.note.en:guide.note.vi}</p></div><figure className="pd-story-photo"><Image src={images[2] || images[0]} alt="" fill sizes="(max-width:1023px) 92vw, 720px" className="object-cover"/></figure></div></section>}
      <div className="pd-container">
        {specs.length>0 && <section className="pd-split" aria-labelledby="pd-specs-heading"><div className="pd-section-heading"><p className="pd-eyebrow">{t('Chi tiết','Details')}</p><h2 id="pd-specs-heading">{t('Thông số sản phẩm','Specifications')}</h2></div><dl className="pd-specs">{specs.map((spec,index)=><div key={index}><dt>{spec.key || t('Chi tiết','Detail')}</dt><dd>{spec.value}</dd></div>)}</dl></section>}
        <section className="pd-split" id="product-reviews" aria-labelledby="pd-reviews-heading"><div className="pd-section-heading"><p className="pd-eyebrow">{t('Từ người đã dùng','From our customers')}</p><h2 id="pd-reviews-heading">{t('Đánh giá sản phẩm','Customer reviews')}</h2></div><TraditionalProductReviews productId={product.id} initialReviews={initialReviews} onReviewSubmitted={async()=>{const {meta}=await getReviews(product.id);if(meta)setReviewStats(meta);}}/></section>
        {relatedProducts.length>0 && <section className="pd-related"><div className="pd-related-heading"><div><p className="pd-eyebrow">{t('Tiếp tục lựa chọn','Keep exploring')}</p><h2>{t('Sản phẩm liên quan','You may also like')}</h2></div><Link href="/products">{t('Xem tất cả','View all')}<ArrowUpRight size={17}/></Link></div><div className="shop-product-grid">{relatedProducts.map(item=><ShopProductCard key={item.id} product={item}/>)}</div></section>}
      </div>
    </main>
    {showBuyBar && <div className="pd-buy-bar"><div className="pd-buy-bar-inner"><span className="pd-buy-bar-thumb"><Image src={images[0]} alt="" fill sizes="72px" className="object-cover"/></span><div className="pd-buy-bar-text"><span>{variant?.name || title}</span><strong>{formatVnd(finalPrice,locale)}</strong></div><button className="shop-btn" type="button" disabled={!available||!!pending} onClick={()=>add('buy')}>{buyLabel}</button></div></div>}
    {en?<ZenFooter/>:<TraditionalFooter/>}
  </div>;
}
