'use client';
import { useAnalyticsView } from './AnalyticsProvider';
import type { Product } from '@/types/product';
import { discountPrice } from '@/lib/commerce';

export default function CatalogView({ products }: { products: Product[] }) {
  useAnalyticsView('view_item_list', { item_list_id: 'catalog', items: products.filter(p => p.is_active !== false).slice(0, 100).map(product => ({ item_id: product.id, price: discountPrice(product), quantity: 1 })) });
  return null;
}
