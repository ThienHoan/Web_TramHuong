import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// INTERFACES
interface ProductVariant {
  name: string;
  price: number;
}

interface ProductTranslation {
  title: string;
  locale: string;
}

interface Product {
  id: string;
  slug: string;
  price: number;
  images: string[];
  variants: ProductVariant[];
  discount_percentage: number;
  discount_start_date: string;
  discount_end_date: string;
  translations: ProductTranslation[];
}

interface CartItemDb {
  id: string;
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  product: Product;
}

@Injectable()
export class CartService {
  constructor(private readonly supabase: SupabaseService) {}

  private get client() {
    return this.supabase.getClient();
  }

  async getCart(userId: string) {
    // Fetch cart items and join with product details (including discount fields)
    const { data, error } = await this.client
      .from('cart_items')
      .select(
        `
                *,
                product:products (
                    id,
                    slug,
                    price,
                    images,
                    variants,
                    discount_percentage,
                    discount_start_date,
                    discount_end_date,
                    translations:product_translations(title, locale)
                )
            `,
      )
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);

    // Transform to simplified CartItem format for frontend
    return (data as unknown as CartItemDb[]).map((item) => {
      const product = item.product;
      // Best effort title (VI -> EN -> first available)
      const title =
        product.translations?.find((t: any) => t.locale === 'vi')?.title ||
        product.translations?.find((t: any) => t.locale === 'en')?.title ||
        product.translations?.[0]?.title ||
        product.slug;

      let price = product.price;
      // Resolve variant price
      if (item.variant_id && Array.isArray(product.variants)) {
        // We stored variant name in variant_id for now
        const variant = product.variants.find(
          (v) => v.name === item.variant_id,
        );
        if (variant && variant.price !== undefined) {
          price = Number(variant.price);
        }
      }

      // ✅ CALCULATE DISCOUNT (matching frontend logic)
      const discountPercent = product.discount_percentage || 0;
      const now = new Date();
      const startDate = product.discount_start_date
        ? new Date(product.discount_start_date)
        : null;
      const endDate = product.discount_end_date
        ? new Date(product.discount_end_date)
        : null;

      const isDiscountActive =
        discountPercent > 0 &&
        (!startDate || now >= startDate) &&
        (!endDate || now <= endDate);

      const finalPrice = isDiscountActive
        ? Math.round(price * (1 - discountPercent / 100))
        : price;

      const discountAmount = isDiscountActive ? price - finalPrice : 0;

      return {
        cartItemId: item.id, // Primary Key of cart_item
        id: product.id,
        slug: product.slug,
        title: title,
        price: finalPrice, // ✅ Return discounted price
        original_price: price, // ✅ Phase 2
        discount_amount: discountAmount, // ✅ Phase 2
        image: product.images?.[0] || null,
        quantity: item.quantity,
        variantId: item.variant_id || null,
        variantName: item.variant_name || null,
      };
    });
  }

  async mergeCart(
    userId: string,
    items: {
      id: string;
      quantity: number;
      variantId?: string;
      variantName?: string;
    }[],
  ) {
    if (!items || items.length === 0) return { success: true };

    for (const item of items) {
      // Check existence
      let query = this.client
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', item.id);

      if (item.variantId) {
        query = query.eq('variant_id', item.variantId);
      } else {
        query = query.is('variant_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update quantity
        await this.client
          .from('cart_items')
          .update({ quantity: existing.quantity + item.quantity })
          .eq('id', existing.id);
      } else {
        // Insert new
        await this.client.from('cart_items').insert({
          user_id: userId,
          product_id: item.id,
          quantity: item.quantity,
          variant_id: item.variantId || null,
          variant_name: item.variantName || null,
        });
      }
    }

    return this.getCart(userId);
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number = 1,
    variantId?: string,
    variantName?: string,
  ) {
    // Upsert logic (Summing)
    let query = this.client
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const { error } = await this.client
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
      if (error) throw new BadRequestException(error.message);
    } else {
      const { error } = await this.client.from('cart_items').insert({
        user_id: userId,
        product_id: productId,
        quantity: quantity,
        variant_id: variantId || null,
        variant_name: variantName || null,
      });
      if (error) throw new BadRequestException(error.message);
    }

    return { success: true };
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    const { error } = await this.client
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', userId)
      .eq('id', itemId); // Use Row ID

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  async removeItem(userId: string, itemId: string) {
    const { error } = await this.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('id', itemId); // Use Row ID

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
  async clearCart(userId: string) {
    const { error } = await this.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
