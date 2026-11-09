import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { Link } from '@/i18n/routing';
import ShopProductGrid from './ShopProductGrid';
import { allProductsHref } from '@/lib/catalog';
import type { Category, Product } from '@/types/product';
import './shop.css';

export default function ShopDiscovery({products,categories,locale='vi'}:{products:Product[];categories:Category[];locale?:string}) {
  const en=locale!=='vi', t=(vi:string,english:string)=>en?english:vi;
  const featured=[...products].filter(p=>p.is_active!==false).sort((a,b)=>Number(!!b.is_featured)-Number(!!a.is_featured)).slice(0,4);
  const activeCategories=categories.filter(c=>c.is_active).slice(0,8);
  return <section className="shop-discovery tp-section" id="chon-san-pham" aria-labelledby="discover-products-heading">
    <div className="tp-container">
      <div className="tp-section-heading">
        <div>
          <p className="tp-eyebrow">{t('BẮT ĐẦU TỪ ĐIỀU BẠN CẦN','START WITH WHAT YOU NEED')}</p>
          <h2 id="discover-products-heading">{t('Tìm phẩm trầm','Find your kind')}<br/><em>{t('phù hợp với bạn.','of agarwood.')}</em></h2>
        </div>
        <Link href={allProductsHref(locale)} className="tp-text-link">{t('Xem toàn bộ sản phẩm','Browse all products')}<ArrowUpRight size={18}/></Link>
      </div>
      <div className="shop-finder">
        <form action={`/${locale}/products`} method="get" className="shop-home-search" role="search">
          <label htmlFor="home-product-search" className="sr-only">{t('Tìm sản phẩm trầm hương','Find agarwood products')}</label>
          <Search size={18} aria-hidden="true"/>
          <input data-bare id="home-product-search" type="search" name="search" placeholder={t('Bạn đang tìm sản phẩm nào?','What are you looking for?')}/>
          <button data-bare type="submit" className="tp-icon-button" aria-label={t('Tìm kiếm','Search')}><ArrowRight size={18}/></button>
        </form>
        {activeCategories.length>0 && <nav className="shop-category-links" aria-label={t('Chọn loại sản phẩm','Browse by category')}>{activeCategories.map(c=><Link href={`/products/category/${c.slug}`} key={c.id}>{c.translation?.name || c.slug}</Link>)}</nav>}
      </div>
      {featured.length>0 && <ShopProductGrid products={featured} locale={locale}/>}
      {(featured.length===0 || featured.length>=4) && <div className="shop-discovery-support"><p>{t('Chưa biết chọn loại nào? Hỏi Thiên Phúc về chất liệu, mùi hương và cách sử dụng trước khi mua.','Not sure where to start? Ask us about materials, scent and how to use a product before buying.')}</p><Link href="/contact" className="tp-text-link">{t('Nhờ tư vấn chọn trầm','Help me choose')}<ArrowUpRight size={16}/></Link></div>}
    </div>
  </section>;
}
