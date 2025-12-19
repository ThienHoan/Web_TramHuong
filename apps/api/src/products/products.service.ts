import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProductsService {
    constructor(private readonly supabase: SupabaseService) { }

    async findAll(locale: string = 'en') {
        const client = this.supabase.getClient();
        const { data, error } = await client
            .from('products')
            .select(`
        *,
        translations:product_translations(*)
      `)
            .eq('product_translations.locale', locale)
            .eq('is_active', true);

        if (error) {
            throw error;
        }

        // Flatten translations (Similar logic to findOne, but for array)
        return data.map((product: any) => {
            const translation = product.translations?.[0] || {};
            const { translations, ...rest } = product;
            return {
                ...rest,
                translation
            };
        });
    }

    async findOne(slug: string, locale: string = 'en') {
        const client = this.supabase.getClient();

        // Fetch product and the specific translation for the locale
        // We do NOT filter by style here. We return everything.
        const { data, error } = await client
            .from('products')
            .select(`
        *,
        translations:product_translations(*)
      `)
            .eq('slug', slug)
            .eq('product_translations.locale', locale)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            throw new NotFoundException(`Product with slug '${slug}' not found`);
        }

        // Supabase returns translations as an array, but due to our .eq filter on locale
        // and the unique constraint, it should be a single item or empty if that locale missing.
        // However, .single() on the root resource applies to 'products'. 
        // The embedded resource 'translations' will be an array.

        // We flatten the response for the frontend convenience, 
        // or just return as is. The rule says "Backend provides full product data and locale-specific translations."
        // Let's formatting it slightly to be cleaner, merging the translation into the main object
        // OR just return the nested structure. Nested is safer to distinguish fields.
        // Let's stick to returning a clean DTO structure.

        const translation = data.translations && data.translations[0] ? data.translations[0] : null;

        if (!translation) {
            // Fallback logic could go here (e.g. return default locale), 
            // but for now let's just return what we found or null translation.
        }

        return {
            ...data,
            translation: translation || null,
            translations: undefined // Remove the raw array
        };
    }
}
