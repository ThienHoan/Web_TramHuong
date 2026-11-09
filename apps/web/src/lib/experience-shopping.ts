import type { Category } from '@/types/product';

export type ExperienceShoppingLinks = { bracelet: string; ritual: string; gallery: string; gift: string };

export function experienceShoppingLinks(categories: Category[]): ExperienceShoppingLinks {
  const find = (terms: string[], fallback: string) => {
    const category = categories.find(item => {
      if (item.is_active === false) return false;
      const text = [item.slug, item.translation?.name, ...(item.translations || []).map(t => t.name)]
        .filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return terms.some(term => text.includes(term));
    });
    return category ? `/products/category/${category.slug}` : fallback;
  };
  return {
    bracelet: find(['vong', 'bracelet'], '/products'),
    ritual: find(['nu-tram', 'nhang', 'incense', 'thuong-huong'], '/products'),
    gallery: '/products',
    gift: find(['qua-tang', 'gift'], '/contact'),
  };
}
