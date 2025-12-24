import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProductsService {
    constructor(private readonly supabase: SupabaseService) { }

    async findAll(locale: string = 'en', options?: {
        include_inactive?: boolean;
        search?: string;
        category?: string;
        sort?: string;
        page?: number;
        limit?: number;
        stock_status?: string; // 'in_stock' | 'out_of_stock' | 'low_stock'
    }) {
        const client = this.supabase.getClient();
        let query = client
            .from('products')
            .select(`
        *,
        quantity,
        translations:product_translations(*)
      `, { count: 'exact' });

        // Filter by Locale for translations (Inner join trick: only products with this locale translation)
        // Actually, we want LEFT JOIN for products, but we filter translation.
        // Let's filter later or use proper join. For now, strict filter is fine.
        // Filter by Locale for translations (Inner join trick: only products with this locale translation)
        query = query.eq('product_translations.locale', locale);

        // Filter: Active Status
        if (!options?.include_inactive) {
            query = query.eq('is_active', true);
        }

        // Filter: Category
        if (options?.category) {
            query = query.ilike('category', options.category);
        }

        // Filter: Stock Status (Backend Level)
        if (options?.stock_status) {
            if (options.stock_status === 'in_stock') {
                query = query.gt('quantity', 0);
            } else if (options.stock_status === 'out_of_stock') {
                query = query.eq('quantity', 0);
            } else if (options.stock_status === 'low_stock') {
                query = query.gt('quantity', 0).lt('quantity', 10);
            }
        }

        // Sorting (SQL Level - Efficient for all cases)
        // WHITELIST CHECK to prevent injection/errors
        const ALLOWED_SORT_FIELDS = ['price', 'quantity', 'created_at', 'slug'];

        if (options?.sort) {
            const [field, direction] = options.sort.split(':');
            const dir = direction === 'asc' ? 'asc' : 'desc'; // Force 'asc' or 'desc'

            if (ALLOWED_SORT_FIELDS.includes(field)) {
                query = query.order(field, { ascending: dir === 'asc' });
            } else {
                // Default fallback if invalid sort field provided
                query = query.order('created_at', { ascending: false });
            }
        } else {
            query = query.order('created_at', { ascending: false });
        }

        // --- SEARCH LOGIC ---
        // If Search is active, we cannot rely on simple SQL ILIKE because we need to search 
        // in 'slug' OR 'translations.title' (Foreign Table).
        // Supabase/PostgREST cross-table OR filtering is complex/limited.
        // STRATEGY: 
        // 1. If Searching: Fetch ALL matching rows (ignoring pagination), Filter in Memory, Then Paginate in Memory.
        // 2. If Not Searching: Paginate in SQL (Efficient).

        if (options?.search) {
            // EXECUTE QUERY WITHOUT PAGINATION
            const { data, error } = await query;
            if (error) throw error;

            // Flatten & Format
            let items = data.map((product: any) => {
                const translation = product.translations?.[0] || {};
                const { translations, ...rest } = product;
                return { ...rest, translation };
            });

            // IN-MEMORY FILTER (Slug OR Title)
            const lowerSearch = options.search.toLowerCase();
            items = items.filter(item =>
                item.slug.toLowerCase().includes(lowerSearch) ||
                item.translation?.title?.toLowerCase().includes(lowerSearch)
            );

            // IN-MEMORY PAGINATION
            const page = options?.page || 1;
            const limit = options?.limit || 20;
            const total = items.length;
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedItems = items.slice(startIndex, endIndex);

            return {
                data: paginatedItems,
                meta: {
                    total,
                    page,
                    limit,
                    last_page: Math.ceil(total / limit) || 1
                }
            };

        } else {
            // SQL PAGINATION (Standard flow)
            const page = options?.page || 1;
            const limit = options?.limit || 20;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;

            // Flatten & Format
            const items = data.map((product: any) => {
                const translation = product.translations?.[0] || {};
                const { translations, ...rest } = product;
                return { ...rest, translation };
            });

            return {
                data: items,
                meta: {
                    total: count,
                    page,
                    limit,
                    last_page: Math.ceil((count || 0) / limit) || 1
                }
            };
        }
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
            // translations needed for Admin Edit to populate all languages
        };
    }

    async create(body: any, file: Express.Multer.File) {
        // Upload image and store as array for future gallery support
        const imageUrl = await this.uploadImage(file);
        const { title_en, title_vi, desc_en, desc_vi, price, slug, category, quantity } = body;

        const client = this.supabase.getClient();

        // 1. Create Product
        const { data: product, error: prodError } = await client
            .from('products')
            .insert({
                slug,
                // Remove dots in price if present (frontend might send "50.000")
                price: parseFloat(price.toString().replace(/\./g, '')),
                images: [imageUrl], // Store as JSONB Array
                category,
                quantity: quantity ? parseInt(quantity) : 0,
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
        if (body.price) {
            // Remove dots (thousands separators) and convert to float
            const cleanPrice = body.price.toString().replace(/\./g, '');
            updateData.price = parseFloat(cleanPrice);
        }
        if (body.slug) updateData.slug = body.slug;
        if (body.category) updateData.category = body.category;
        if (body.quantity !== undefined && body.quantity !== null) updateData.quantity = parseInt(body.quantity);
        if (body.is_active !== undefined) updateData.is_active = body.is_active === 'true' || body.is_active === true;


        // Update Product
        if (Object.keys(updateData).length > 0) {
            const { error } = await client
                .from('products')
                .update(updateData)
                .eq('id', id);

            if (error) {
                console.error('Update Product Error:', error);
                throw new BadRequestException(error.message);
            }
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

    async bulkUpdate(ids: string[], action: 'delete' | 'archive' | 'restore' | 'update_category', payload?: any) {
        const client = this.supabase.getClient();

        if (!ids || ids.length === 0) return { success: false, message: 'No IDs provided' };

        let updateData: any = {};

        switch (action) {
            case 'delete': // Hard delete not recommended, but let's assume Soft Delete (Archive) is primary
            case 'archive':
                updateData = { is_active: false };
                break;
            case 'restore':
                updateData = { is_active: true };
                break;
            case 'update_category':
                if (!payload?.category) throw new BadRequestException('Category required for update_category action');
                updateData = { category: payload.category };
                break;
            default:
                throw new BadRequestException('Invalid bulk action');
        }

        const { error } = await client
            .from('products')
            .update(updateData)
            .in('id', ids);

        if (error) throw new BadRequestException(`Bulk update failed: ${error.message}`);

        return { success: true, count: ids.length };
    }

    async exportProducts(locale: string = 'en', options?: any) {
        // Reuse findAll logic but with no limit (fetch all matching)
        const { data } = await this.findAll(locale, { ...options, page: 1, limit: 10000 }); // Cap at 10k for safety

        if (!data || data.length === 0) return '';

        // Generate CSV Header
        const headers = ['ID', 'Slug', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Created At'];
        const rows = data.map((item: any) => [
            item.id,
            item.slug,
            `"${(item.translation?.title || '').replace(/"/g, '""')}"`, // Escape quotes
            item.category,
            item.price,
            item.quantity,
            item.is_active ? 'Active' : 'Archived',
            item.created_at
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row: any[]) => row.join(','))
        ].join('\n');

        return csvContent;
    }
}
