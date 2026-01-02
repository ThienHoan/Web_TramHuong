import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProductsService {
    constructor(private readonly supabase: SupabaseService) { }

    async findAll(locale: string = 'en', options?: {
        include_inactive?: boolean;
        search?: string;
        category?: string;
        category_id?: string | number;
        sort?: string;
        page?: number;
        limit?: number;
        stock_status?: string; // 'in_stock' | 'out_of_stock' | 'low_stock'
        min_price?: number;
        max_price?: number;
        is_featured?: boolean;
        featured_section?: string;
    }) {
        const client = this.supabase.getClient();
        const isFilteringByCategorySlug = !!options?.category;

        let selectQuery = `
        *,
        quantity,
        translations:product_translations(*),
        category:categories${isFilteringByCategorySlug ? '!inner' : '!category_id'}(
            id,
            slug,
            translations:category_translations(*)
        )
      `;

        let query = client
            .from('products')
            .select(selectQuery, { count: 'exact' });

        // Filter by Locale for translations (Inner join trick: only products with this locale translation)
        // Actually, we want LEFT JOIN for products, but we filter translation.
        // Let's filter later or use proper join. For now, strict filter is fine.
        // Filter by Locale for translations (Inner join trick: only products with this locale translation)
        query = query.eq('product_translations.locale', locale);

        // Filter: Active Status
        if (!options?.include_inactive) {
            query = query.eq('is_active', true);
        }

        // Filter: Featured Section
        if (options?.featured_section) {
            query = query.eq('featured_section', options.featured_section);
        }

        // Filter: Featured Legacy (Optional, can rely on section)
        if (options?.is_featured !== undefined) {
            query = query.eq('is_featured', options.is_featured);
        }

        // Filter: Category Slug
        if (options?.category) {
            query = query.eq('category.slug', options.category);
        }

        // Filter: Category ID (More robust)
        if (options?.category_id) {
            query = query.eq('category_id', options.category_id);
        }

        // Filter: Price Range
        if (options?.min_price !== undefined) {
            query = query.gte('price', options.min_price);
        }
        if (options?.max_price !== undefined) {
            query = query.lte('price', options.max_price);
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
        translations:product_translations(*),
        category:categories!category_id(
            id,
            slug,
            translations:category_translations(*)
        )
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
        translations:product_translations(*),
        category:categories!category_id(
            id,
            slug,
            translations:category_translations(*)
        )
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

    async create(body: any, files: Array<Express.Multer.File>) {
        // Upload images
        const imageUrls = files && files.length > 0
            ? await Promise.all(files.map(file => this.uploadImage(file)))
            : [];
        const { title_en, title_vi, desc_en, desc_vi, price, original_price, slug, category, quantity, variants, specifications_en, specifications_vi, seo_title_en, seo_title_vi, seo_desc_en, seo_desc_vi } = body;

        const client = this.supabase.getClient();

        // Resolve Category Slug to ID
        let category_id = null;
        if (category) {
            const { data: catData } = await client.from('categories').select('id').eq('slug', category).single();
            if (catData) category_id = catData.id;
        }

        // Parse Variants (if sent as stringified JSON in FormData)
        let parsedVariants = [];
        try {
            if (variants) {
                parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
            }
        } catch (e) {
            console.warn('Failed to parse variants', e);
        }

        // 1. Create Product
        const { data: product, error: prodError } = await client
            .from('products')
            .insert({
                slug,
                // Remove dots in price if present (frontend might send "50.000")
                price: parseFloat(price.toString().replace(/\./g, '')),
                original_price: original_price ? parseFloat(original_price.toString().replace(/\./g, '')) : null,
                images: imageUrls, // Store as JSONB Array
                category_id: category_id,
                quantity: quantity ? parseInt(quantity) : 0,
                style: body.style || 'both',
                is_active: true,
                is_featured: body.is_featured === 'true' || body.is_featured === true,
                featured_section: body.featured_section || null,
                variants: parsedVariants,
                // Discount fields
                discount_percentage: body.discount_percentage ? parseInt(body.discount_percentage) : 0,
                discount_start_date: body.discount_start_date || null,
                discount_end_date: body.discount_end_date || null,
            })
            .select()
            .single();

        if (prodError) throw new BadRequestException(prodError.message);

        // 2. Create Translations
        const translations = [
            {
                product_id: product.id,
                locale: 'en',
                title: title_en,
                description: desc_en,
                specifications: specifications_en,
                seo_title: seo_title_en,
                seo_description: seo_desc_en
            },
            {
                product_id: product.id,
                locale: 'vi',
                title: title_vi,
                description: desc_vi,
                specifications: specifications_vi,
                seo_title: seo_title_vi,
                seo_description: seo_desc_vi
            }
        ];

        const { error: transError } = await client
            .from('product_translations')
            .insert(translations);

        if (transError) throw new BadRequestException(transError.message);

        return product;
    }

    async update(id: string, body: any, files?: Array<Express.Multer.File>) {
        console.log('Update Product ID:', id);
        console.log('Update Body:', JSON.stringify(body));

        const client = this.supabase.getClient();
        let updateData: any = {};

        // Parse keep_images
        let keepImages: string[] = [];
        if (body.keep_images) {
            try {
                keepImages = typeof body.keep_images === 'string' ? JSON.parse(body.keep_images) : body.keep_images;
            } catch { }
        }

        // Upload new files
        let newImageUrls: string[] = [];
        if (files && files.length > 0) {
            newImageUrls = await Promise.all(files.map(f => this.uploadImage(f)));
        }

        // Combine if any change (files uploaded OR keep_images field sent)
        if ((files && files.length > 0) || body.keep_images) {
            updateData.images = [...keepImages, ...newImageUrls];
        }
        if (body.price) {
            // Remove dots (thousands separators) and convert to float
            const cleanPrice = body.price.toString().replace(/\./g, '');
            updateData.price = parseFloat(cleanPrice);
        }
        if (body.original_price !== undefined) {
            if (body.original_price === '' || body.original_price === null) {
                updateData.original_price = null;
            } else {
                updateData.original_price = parseFloat(body.original_price.toString().replace(/\./g, ''));
            }
        }
        if (body.slug) updateData.slug = body.slug;
        if (typeof body.category !== 'undefined') {
            // If category is provided, resolve to ID
            // If it's empty string, maybe unlink? For now assume valid slug.
            if (body.category) {
                const { data: catData } = await client.from('categories').select('id').eq('slug', body.category).single();
                if (catData) updateData.category_id = catData.id;
            }
        }
        if (body.quantity !== undefined && body.quantity !== null) updateData.quantity = parseInt(body.quantity);
        if (body.is_active !== undefined) updateData.is_active = body.is_active === 'true' || body.is_active === true;
        if (body.is_featured !== undefined) updateData.is_featured = body.is_featured === 'true' || body.is_featured === true;

        if (body.featured_section !== undefined) {
            updateData.featured_section = body.featured_section === '' ? null : body.featured_section;
        }

        // Discount fields
        if (body.discount_percentage !== undefined) {
            updateData.discount_percentage = parseInt(body.discount_percentage) || 0;
        }
        if (body.discount_start_date !== undefined) {
            updateData.discount_start_date = body.discount_start_date || null;
        }
        if (body.discount_end_date !== undefined) {
            updateData.discount_end_date = body.discount_end_date || null;
        }

        console.log('Final Update Data:', JSON.stringify(updateData));

        // Variants
        if (body.variants) {
            try {
                updateData.variants = typeof body.variants === 'string' ? JSON.parse(body.variants) : body.variants;
            } catch (e) {
                console.warn('Failed to parse variants update', e);
            }
        }


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
        const { title_en, title_vi, desc_en, desc_vi, specifications_en, specifications_vi, seo_title_en, seo_title_vi, seo_desc_en, seo_desc_vi } = body;

        // Prepare translation upserts
        if (title_en !== undefined || desc_en !== undefined || specifications_en !== undefined || seo_title_en !== undefined || seo_desc_en !== undefined) {
            const payload: any = { product_id: id, locale: 'en' };
            if (title_en !== undefined) payload.title = title_en;
            if (desc_en !== undefined) payload.description = desc_en;
            if (specifications_en !== undefined) payload.specifications = specifications_en;
            if (seo_title_en !== undefined) payload.seo_title = seo_title_en;
            if (seo_desc_en !== undefined) payload.seo_description = seo_desc_en;

            await client.from('product_translations').upsert(payload, { onConflict: 'product_id,locale' });
        }

        if (title_vi !== undefined || desc_vi !== undefined || specifications_vi !== undefined || seo_title_vi !== undefined || seo_desc_vi !== undefined) {
            const payload: any = { product_id: id, locale: 'vi' };
            if (title_vi !== undefined) payload.title = title_vi;
            if (desc_vi !== undefined) payload.description = desc_vi;
            if (specifications_vi !== undefined) payload.specifications = specifications_vi;
            if (seo_title_vi !== undefined) payload.seo_title = seo_title_vi;
            if (seo_desc_vi !== undefined) payload.seo_description = seo_desc_vi;

            await client.from('product_translations').upsert(payload, { onConflict: 'product_id,locale' });
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
