import { Link } from '@/i18n/routing';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import TraditionalHeader from '@/components/traditional/TraditionalHeader';
import TraditionalFooter from '@/components/traditional/TraditionalFooter';
import ZenFooter from '@/components/zen/ZenFooter';
import ShopProductGrid from './ShopProductGrid';
import ShopCatalogFilters, { ShopCategoryLinks } from './ShopCatalogFilters';
import type { Category, Product } from '@/types/product';
import type { PaginationMeta } from '@/services/product-service';
import '@/components/traditional/collections.css';
import './shop.css';

import { allProductsHref, catalogHref, type CatalogFilters } from '@/lib/catalog';
export default function ShopCatalog({products,categories,filters,pagination,locale}: {products:Product[];categories:Category[];filters:CatalogFilters;pagination?:PaginationMeta;locale:string}) {
  const en=locale!=='vi', t=(vi:string,english:string)=>en?english:vi;
  const category=categories.find(c=>c.slug===filters.category || c.id===filters.category);
  const pageHref=(page:number)=>category&&!filters.search&&!filters.min_price&&!filters.max_price&&filters.sort==='recommended'?`/products/category/${category.slug}${page>1?`?page=${page}`:''}`:catalogHref(filters,{page, ...(!en && !filters.search && !filters.category && !filters.min_price && !filters.max_price && filters.sort==='recommended'?{sort:'newest'}:{})});
  const narrowed=!!(filters.search||filters.min_price||filters.max_price);
  const allHref=allProductsHref(locale);
  const title=category?.translation?.name || (en
    ? <>Find your kind<br/><em>of agarwood.</em></>
    : narrowed ? <>Chọn một làn hương<br/><em>cho bạn.</em></> : <>Toàn bộ<br/><em>phẩm trầm.</em></>);
  const total=pagination?.total ?? products.length, pages=pagination?.last_page || 1;
  return <div className={`atelier-page shop-commerce ${en?'shop-commerce-en':''}`}>
    {!en && <TraditionalHeader/>}
    <main className="shop-catalog">
      <div className="tp-container">
        <nav aria-label={t('Đường dẫn','Breadcrumb')} className="shop-breadcrumb"><Link href="/">{t('Trang chủ','Home')}</Link><span>/</span><Link href="/products">{t('Bộ sưu tập','Products')}</Link>{category ? <><span>/</span><span>{category.translation?.name || category.slug}</span></> : !en && <><span>/</span><span>Toàn bộ sản phẩm</span></>}</nav>
        <header className="collection-intro">
          <div><p className="shop-kicker">THIÊN PHÚC · {t('TRẦM HƯƠNG VIỆT','VIETNAMESE AGARWOOD')}</p><h1>{title}</h1></div>
          <div className="collection-intro-copy">
            <p>{t('Xem ảnh, so sánh giá và chọn phân loại phù hợp. Cần hiểu thêm về chất liệu hay cách dùng? Thiên Phúc luôn sẵn lòng tư vấn.','Browse photos, compare prices and choose your options. Ask us about materials or use before you decide.')}</p>
            {!en && <Link href="/products" className="tp-text-link">Khám phá theo từng chương <ArrowUpRight size={17}/></Link>}
          </div>
        </header>
      </div>
      <nav className="collection-chapter-nav" aria-label={t('Danh mục sản phẩm','Product categories')}>
        <div className="tp-container"><ShopCategoryLinks categories={categories} filters={filters} locale={locale}/></div>
      </nav>
      <div className="tp-container">
        <ShopCatalogFilters filters={filters} locale={locale}/>
        <div className="shop-results-heading"><p role="status">{filters.search?`${t('Kết quả cho','Results for')} “${filters.search}” · `:''}{total} {t('sản phẩm','products')}{filters.page>1?` · ${t('Trang','Page')} ${filters.page}`:''}</p>{(filters.search||filters.category||filters.min_price||filters.max_price) && <Link href={allHref}>{t('Xóa bộ lọc','Clear filters')}</Link>}</div>
        {products.length ? <ShopProductGrid products={products} locale={locale}/> : <div className="shop-empty"><h2>{t('Chưa tìm thấy sản phẩm phù hợp.','No matching products yet.')}</h2><p>{t('Thử từ khóa ngắn hơn hoặc mở rộng khoảng giá. Bạn cũng có thể nhờ cửa hàng cùng chọn.','Try a shorter search or a wider budget. We can also help you choose.')}</p><Link href={allHref} className="shop-btn">{t('Xem tất cả sản phẩm','Browse all products')}</Link><Link href="/contact" className="tp-text-link">{t('Nhờ Thiên Phúc tư vấn','Ask us for advice')}<ArrowUpRight size={16}/></Link></div>}
        {pages>1 && <nav className="shop-catalog-pagination" aria-label={t('Phân trang sản phẩm','Product pagination')}>{filters.page>1 && <Link href={pageHref(filters.page-1)}><ArrowLeft size={17}/>{t('Trước','Previous')}</Link>}<span>{t('Trang','Page')} {filters.page} / {pages}</span>{filters.page<pages && <Link href={pageHref(filters.page+1)}>{t('Tiếp','Next')}<ArrowRight size={17}/></Link>}</nav>}
      </div>
      <aside className="tp-contact-band shop-shopping-help">
        <div className="tp-container">
          <div><p className="tp-eyebrow">{t('THIÊN PHÚC LUÔN LẮNG NGHE','WE ARE HERE TO HELP')}</p><h2>{t('Chọn trầm cùng Thiên Phúc','Choose with Thien Phuc')}</h2></div>
          <div className="shop-shopping-help-copy">
            <p>{t('Trước khi chọn mua, hãy xem kỹ ảnh thật, phân loại và thông số của từng sản phẩm. Nếu cần xác nhận chất liệu, nguồn gốc hoặc cách sử dụng, liên hệ cửa hàng để được giải đáp.','Check product photos, options and specifications. Contact us to confirm materials, origin or how to use an item.')}</p>
            <div><Link href="/contact" className="shop-btn">{t('Tư vấn chọn sản phẩm','Product advice')}<ArrowUpRight size={17}/></Link><Link href="/policies/shipping" className="tp-text-link">{t('Giao hàng & thanh toán','Delivery & payment')}<ArrowUpRight size={15}/></Link><Link href="/policies/returns" className="tp-text-link">{t('Đổi trả & hỗ trợ','Returns & support')}<ArrowUpRight size={15}/></Link></div>
          </div>
        </div>
      </aside>
    </main>{en?<ZenFooter/>:<TraditionalFooter/>}
  </div>;
}
