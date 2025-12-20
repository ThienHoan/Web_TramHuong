import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProductsService {
    constructor(private readonly supabase: SupabaseService) { }

    async findAll(locale: string = 'en', options?: { include_inactive?: boolean }) {
        const client = this.supabase.getClient();
        const query = client
            .from('products')
            .select(`
        *,
        translations:product_translations(*)
      `)
            .eq('product_translations.locale', locale);

        if (!options?.include_inactive) {
            query.eq('is_active', true);
        }

        const { data, error } = await query;

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

    async findById(id: string) {
        const client = this.supabase.getClient();

        const { data, error } = await client
            .from('products')
            .select(`
        *,
        translations:product_translations(*)
      `)
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException(`Product with id '${id}' not found`);
        }

        const translation = data.translations && data.translations[0] ? data.translations[0] : null;

        return {
            ...data,
            translation: translation || null,
            translations: undefined
        };
    }

    async create(body: any, file: Express.Multer.File) {
        // Upload image and store as array for future gallery support
        const imageUrl = await this.uploadImage(file);
        const { title_en, title_vi, desc_en, desc_vi, price, slug, category } = body;

        const client = this.supabase.getClient();

        // 1. Create Product
        const { data: product, error: prodError } = await client
            .from('products')
            .insert({
                slug,
                price: parseFloat(price),
                images: [imageUrl], // Store as JSONB Array
                category,
                style: body.style || 'default',
                is_active: true
            })
            .select()
            .single();

        if (prodError) throw new BadRequestException(prodError.message);

        // 2. Create Translations
        const translations = [
            { product_id: product.id, locale: 'en', title: title_en, description: desc_en },
            { product_id: product.id, locale: 'vi', title: title_vi, description: desc_vi }
        ];

        const { error: transError } = await client
            .from('product_translations')
            .insert(translations);

        if (transError) throw new BadRequestException(transError.message);

        return product;
    }

    async update(id: string, body: any, file?: Express.Multer.File) {
        const client = this.supabase.getClient();
        let updateData: any = {};

        if (file) {
            const imageUrl = await this.uploadImage(file);
            updateData.images = [imageUrl]; // Replace images with new single image (for now)
        }
        if (body.price) updateData.price = parseFloat(body.price);
        if (body.slug) updateData.slug = body.slug;
        if (body.category) updateData.category = body.category;
        if (body.is_active !== undefined) updateData.is_active = body.is_active === 'true' || body.is_active === true;


        // Update Product
        if (Object.keys(updateData).length > 0) {
            const { error } = await client.from('products').update(updateData).eq('id', id);
            if (error) throw new BadRequestException(error.message);
        }

        // Update Translations (Upsert)
        const { title_en, title_vi, desc_en, desc_vi } = body;
        if (title_en || desc_en) {
            await client.from('product_translations').upsert({
                product_id: id, locale: 'en',
                title: title_en, description: desc_en
            }, { onConflict: 'product_id,locale' });
        }
        if (title_vi || desc_vi) {
            await client.from('product_translations').upsert({
                product_id: id, locale: 'vi',
                title: title_vi, description: desc_vi
            }, { onConflict: 'product_id,locale' });
        }

        return { success: true };
    }

    async softDelete(id: string) {
        const client = this.supabase.getClient();
        const { error } = await client
            .from('products')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw new BadRequestException(error.message);
        return { success: true };
    }

    async uploadImage(file: Express.Multer.File): Promise<string> {
        const client = this.supabase.getClient();
        const fileName = `${Date.now()}_${file.originalname}`;

        const { data, error } = await client.storage
            .from('product-images')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) throw new BadRequestException('Image upload failed: ' + error.message);

        const { data: { publicUrl } } = client.storage
            .from('product-images')
            .getPublicUrl(fileName);

        return publicUrl;
    }
}
