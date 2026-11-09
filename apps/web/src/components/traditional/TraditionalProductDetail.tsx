'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, Minus, Plus, ShoppingBag, ZoomIn, Truck, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/routing';
import { useCart } from '@/components/providers/CartProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { useAnalyticsView } from '@/components/analytics/AnalyticsProvider';
import ProductJsonLd from '@/components/seo/ProductJsonLd';
import { useProductDiscount } from '@/hooks/useProductDiscount';
import { ProductPrice } from '@/components/ui/ProductPrice';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TraditionalHeader from './TraditionalHeader';
import TraditionalFooter from './TraditionalFooter';
import ZenFooter from '@/components/zen/ZenFooter';
import TraditionalProductReviews from './TraditionalProductReviews';
import ShopProductCard from '@/components/shop/ShopProductCard';
import { getReviews } from '@/lib/api-client';
import { firstAvailableVariant, formatVnd, productStock, specifications, variantKey } from '@/lib/commerce';
import { SHOP_CONTACT } from '@/lib/legal';
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
  const [activeTab,setActiveTab]=useState('description');
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
  const [showSticky,setShowSticky]=useState(false);
  const purchase=useRef<HTMLDivElement>(null);
  const title=product.translation?.title || product.title || t('Trầm hương Thiên Phúc','Thien Phuc Agarwood');
  const images=product.images?.length?product.images:['/placeholder.png'];
  const description=product.translation?.description || product.description;
  const specs=specifications(product.translation?.specifications);
  const story=product.translation?.story;
  useAnalyticsView('view_item',{items:[{item_id:product.id,price:finalPrice,quantity:1,...(variant?{item_variant:`variant_${selectedVariantIndex}`}:{})}]});
  useEffect(()=>{
    let frame=0;
    const schedule=()=>{
      if(frame)return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        setShowSticky(!!purchase.current && purchase.current.getBoundingClientRect().bottom<0);
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
  const scrollToInfo=()=>document.getElementById('product-information')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  const changeImage=(delta:number)=>setSelectedImage(images[(images.indexOf(selectedImage)+delta+images.length)%images.length]);
  const buyLabel=pending==='buy'?t('Đang chuyển…','Continuing…'):available?t('Mua ngay','Buy now'):stock>0?t('Đã có đủ trong giỏ','Already in your cart'):t('Tạm hết hàng','Currently unavailable');
  return <div className={`tp-product-detail pd-page ${en?'shop-commerce-en':''}`}>
    <ProductJsonLd product={{...product,rating_average:Number(reviewStats.average),review_count:reviewStats.total}} locale={locale} variantIndex={selectedVariantIndex}/>
    {!en && <TraditionalHeader/>}
    <Dialog open={zoomOpen} onOpenChange={setZoomOpen}><DialogContent className="tp-image-dialog"><DialogTitle className="sr-only">{title}</DialogTitle><DialogDescription className="sr-only">{t('Ảnh phóng lớn. Nhấn Escape để đóng.','Enlarged product image. Press Escape to close.')}</DialogDescription><div className="tp-image-zoom"><Image src={selectedImage} alt={title} fill sizes="(max-width:767px) 95vw, 900px" className="object-contain"/></div>{images.length>1 && <div className="tp-image-controls"><button type="button" aria-label={t('Ảnh trước','Previous image')} onClick={()=>changeImage(-1)}><ArrowLeft size={20}/></button><span>{images.indexOf(selectedImage)+1} / {images.length}</span><button type="button" aria-label={t('Ảnh tiếp theo','Next image')} onClick={()=>changeImage(1)}><ArrowRight size={20}/></button></div>}</DialogContent></Dialog>
    <main><div className="pd-container">
      <nav aria-label={t('Đường dẫn','Breadcrumb')} className="pd-breadcrumb"><Link href="/">{t('Trang chủ','Home')}</Link><span>/</span><Link href="/products">{t('Sản phẩm','Products')}</Link><span>/</span><span aria-current="page">{title}</span></nav>
      <div className="pd-hero">
        <section className="pd-gallery" aria-label={t('Hình ảnh sản phẩm','Product images')}>
          <div className="pd-image"><Image src={selectedImage} alt={title} fill priority sizes="(max-width:767px) 100vw, 55vw" className="object-contain"/><button type="button" className="pd-zoom" onClick={()=>setZoomOpen(true)} aria-label={t('Phóng to ảnh sản phẩm','Enlarge product image')}><ZoomIn size={20}/></button>{images.length>1 && <span className="pd-image-count">{images.indexOf(selectedImage)+1} / {images.length}</span>}</div>
          {images.length>1 && <div className="pd-thumbnails" aria-label={t('Chọn ảnh sản phẩm','Choose product image')}>{images.map((image,index)=><button type="button" key={`${image}-${index}`} aria-label={t(`Xem ảnh sản phẩm ${index+1}`,`View product image ${index+1}`)} aria-pressed={image===selectedImage} onClick={()=>setSelectedImage(image)}><Image src={image} alt="" fill sizes="80px" className="object-cover"/></button>)}</div>}
          <p className="pd-gallery-caption">{t('Xem từng ảnh và phóng to để quan sát chi tiết sản phẩm.','Browse and enlarge the photos to inspect product details.')}</p>
        </section>
        <section className="pd-summary" aria-labelledby="product-title">
          <p className="pd-eyebrow">{product.category?.translation?.name || t('Tuyển chọn Thiên Phúc','Thien Phuc collection')}</p><h1 id="product-title">{title}</h1>
          <button className="pd-rating" type="button" onClick={()=>{setActiveTab('reviews');scrollToInfo();}}>{reviewStats.total>0?<><span className="pd-stars">★ <strong>{Number(reviewStats.average).toFixed(1)}</strong></span><span>· {reviewStats.total} {t('đánh giá','reviews')}</span></>:t('Chưa có đánh giá · Chia sẻ cảm nhận','No reviews yet · Share your experience')}<ArrowUpRight size={15}/></button>
          <div className="pd-price"><ProductPrice product={product} variantPrice={variant?Number(variant.price):undefined} size="xl" theme="traditional"/></div>
          <p className="pd-availability" data-available={stock>0}>{stock>0?t('Còn hàng','In stock'):t('Tạm hết hàng','Currently unavailable')}</p>
          {(product.translation?.short_description||description) && <p className="pd-intro pd-intro-clamp">{product.translation?.short_description || description}</p>}
          {specs.length>0 && <dl className="pd-key-facts">{specs.slice(0,3).map((spec,index)=><div key={index}><dt>{spec.key || t('Chi tiết','Detail')}</dt><dd>{spec.value}</dd></div>)}</dl>}
          <div className="pd-purchase" ref={purchase}>
            {!!product.variants?.length && <fieldset className="pd-variants"><legend>{t('Chọn phân loại','Choose your option')} <span>/ {variant?.name || variant?.sku}</span></legend><div>{product.variants.map((v,index)=><label key={index}><input type="radio" name="variant" checked={index===selectedVariantIndex} onChange={()=>selectVariant(index)}/><span>{v.name || v.sku || `${t('Loại','Option')} ${index+1}`}{productStock(product,v)<=0?` · ${t('Hết hàng','Sold out')}`:''}</span></label>)}</div></fieldset>}
            <div className="pd-order-options"><div><span className="pd-quantity-label">{t('Số lượng','Quantity')}</span><div className="pd-quantity"><button type="button" aria-label={t('Giảm số lượng','Decrease quantity')} disabled={selectedQuantity<=1||!available} onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={17}/></button><output aria-live="polite">{selectedQuantity}</output><button type="button" aria-label={t('Tăng số lượng','Increase quantity')} disabled={!available||selectedQuantity>=remaining} onClick={()=>setQuantity(q=>Math.min(remaining,q+1))}><Plus size={17}/></button></div></div><button type="button" aria-pressed={wishlistItems.has(product.id)} aria-label={t('Lưu sản phẩm yêu thích','Save to wishlist')} className="pd-wishlist" onClick={()=>toggleWishlist(product.id)}><Heart size={20} fill={wishlistItems.has(product.id)?'currentColor':'none'}/></button></div>
            <div className="pd-purchase-buttons"><button type="button" className="shop-btn" disabled={!available||!!pending} onClick={()=>add('buy')}>{buyLabel}<ArrowRight size={18}/></button><button type="button" className="shop-btn shop-btn-secondary" disabled={!available||!!pending} onClick={()=>add('cart')}><ShoppingBag size={18}/>{pending==='cart'?t('Đang thêm…','Adding…'):t('Thêm vào giỏ','Add to cart')}</button></div>
            {inCart>0 && <p className="pd-in-cart">{t(`Đã có ${inCart} sản phẩm này trong giỏ.`,`You have ${inCart} of this item in your cart.`)} <Link href="/checkout">{t('Xem đơn hàng','Review order')}</Link></p>}
            <p className="pd-checkout-note">{t('Có thể đặt hàng không cần tạo tài khoản.','You can checkout without creating an account.')}</p>
          </div>
          <div className="pd-delivery-info"><Truck size={19}/><div><strong>{t('Biết rõ chi phí trước khi đặt','Know the cost before ordering')}</strong><p>{t('Phí giao hàng và tổng tiền được hiển thị theo địa chỉ ở bước thanh toán.','Delivery costs and the order total are shown for your address at checkout.')}</p><Link href="/policies/shipping">{t('Giao hàng & thanh toán','Delivery & payment')}</Link><Link href="/policies/returns">{t('Đổi trả & hỗ trợ','Returns & support')}</Link></div></div>
          <div className="pd-help"><MessageCircle size={17}/><span>{t('Cần hỏi về chất liệu, nguồn gốc hay cách dùng?','Questions about materials, origin or use?')}</span><a href={`tel:${SHOP_CONTACT.phone}`}>{t('Gọi Thiên Phúc','Call Thien Phuc')}<ArrowUpRight size={15}/></a></div>
        </section>
      </div>
      <section className="pd-information" id="product-information" aria-label={t('Thông tin sản phẩm','Product information')}><div className="pd-section-heading"><p className="pd-eyebrow">{t('Tìm hiểu trước khi chọn','Know before you choose')}</p><h2>{t('Thông tin sản phẩm','Product details')}</h2></div><Tabs value={activeTab} onValueChange={setActiveTab} className="pd-tabs"><TabsList className="pd-tab-list"><TabsTrigger value="description">{t('Mô tả','Description')}</TabsTrigger><TabsTrigger value="specs">{t('Thông số','Specifications')}</TabsTrigger>{story && <TabsTrigger value="story">{t('Câu chuyện','Story')}</TabsTrigger>}<TabsTrigger value="reviews">{t('Đánh giá','Reviews')} ({reviewStats.total})</TabsTrigger></TabsList>
        <TabsContent value="description" className="pd-tab-content" forceMount hidden={activeTab!=='description'}><div className="pd-copy"><h3>{t('Về sản phẩm','About this product')}</h3><p>{description || t('Liên hệ Thiên Phúc để được giải đáp thêm về sản phẩm.','Contact us for more information about this product.')}</p></div></TabsContent>
        <TabsContent value="specs" className="pd-tab-content" forceMount hidden={activeTab!=='specs'}><div className="pd-copy"><h3>{t('Thông số sản phẩm','Product specifications')}</h3>{specs.length?<dl className="pd-specs">{specs.map((spec,index)=><div key={index}><dt>{spec.key || t('Chi tiết','Detail')}</dt><dd>{spec.value}</dd></div>)}</dl>:<p>{t('Vui lòng liên hệ cửa hàng để xác nhận thông số trước khi chọn mua.','Please contact us to confirm specifications before ordering.')}</p>}</div></TabsContent>
        {story && <TabsContent value="story" className="pd-tab-content" forceMount hidden={activeTab!=='story'}><div className="pd-copy"><h3>{t('Câu chuyện sản phẩm','The product story')}</h3><p>{story}</p></div></TabsContent>}
        <TabsContent value="reviews" className="pd-tab-content" forceMount hidden={activeTab!=='reviews'}><TraditionalProductReviews productId={product.id} initialReviews={initialReviews} onReviewSubmitted={async()=>{const {meta}=await getReviews(product.id);if(meta)setReviewStats(meta);}}/></TabsContent>
      </Tabs></section>
      {relatedProducts.length>0 && <section className="pd-related"><div className="pd-related-heading"><div><p className="pd-eyebrow">{t('Tiếp tục lựa chọn','Keep exploring')}</p><h2>{t('Sản phẩm liên quan','You may also like')}</h2></div><Link href="/products">{t('Xem tất cả','View all')}<ArrowUpRight size={17}/></Link></div><div className="shop-product-grid">{relatedProducts.map(item=><ShopProductCard key={item.id} product={item}/>)}</div></section>}
    </div></main>
    {showSticky && <div className="pd-mobile-purchase"><div><strong>{formatVnd(finalPrice,locale)}</strong><span>{variant?.name || title}</span></div><button className="shop-btn" type="button" disabled={!available||!!pending} onClick={()=>add('buy')}>{buyLabel}</button></div>}
    {en?<ZenFooter/>:<TraditionalFooter/>}
  </div>;
}
