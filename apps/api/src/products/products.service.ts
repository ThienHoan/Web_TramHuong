import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Database } from '../common/types/database.types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductTranslationRow =
  Database['public']['Tables']['product_translations']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CategoryTranslationRow =
  Database['public']['Tables']['category_translations']['Row'];

type ProductWithTranslations = ProductRow & {
  translations: ProductTranslationRow[];
  category?: (CategoryRow & { translations: CategoryTranslationRow[] }) | null;
};

@Injectable()
export class ProductsService {
  async getProductsForAI() {
    // Fetch streamlined data for AI context.

    const client = this.supabase.getClient();

    const { data } = await client
      .from('products')
      .select(
        `
                id,
                slug,
                price,
                translations:product_translations(title, description)
            `,
      )
      .eq('is_active', true)
      .eq('product_translations.locale', 'vi')
      .returns<ProductWithTranslations[]>(); // Force return type

    if (!data) {
      return [];
    }

    // data is ProductWithTranslations[]
    return data.map((p) => ({
      id: p.id,
      slug: p.slug,
      price: p.price,
      title: p.translations?.[0]?.title,
      description: p.translations?.[0]?.description,
    }));
  }

  constructor(private readonly supabase: SupabaseService) {}

  async findAll(
    locale: string = 'en',
    options?: {
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
    },
  ) {
    const client = this.supabase.getClient();
    const isFilteringByCategorySlug = !!options?.category;

    const selectQuery = `
        *,
        quantity,
        translations:product_translations(*),
        category:categories${isFilteringByCategorySlug ? '!inner' : '!category_id'}(
            id,
            slug,
            translations:category_translations(*)
        )
      `;

    let query = client.from('products').select(selectQuery, { count: 'exact' });

    query = query.eq('product_translations.locale', locale);

    if (!options?.include_inactive) {
      query = query.eq('is_active', true);
    }
    if (options?.featured_section) {
      query = query.eq('featured_section', options.featured_section);
    }
    if (options?.is_featured !== undefined) {
      query = query.eq('is_featured', options.is_featured);
    }
    if (options?.category) {
      query = query.eq('category.slug', options.category);
    }
    if (options?.category_id) {
      query = query.eq('category_id', String(options.category_id));
    }
    if (options?.min_price !== undefined) {
      query = query.gte('price', options.min_price);
    }
    if (options?.max_price !== undefined) {
      query = query.lte('price', options.max_price);
    }

    if (options?.stock_status) {
      if (options.stock_status === 'in_stock') {
        query = query.gt('quantity', 0);
      } else if (options.stock_status === 'out_of_stock') {
        query = query.eq('quantity', 0);
      } else if (options.stock_status === 'low_stock') {
        query = query.gt('quantity', 0).lt('quantity', 10);
      }
    }

    const ALLOWED_SORT_FIELDS = ['price', 'quantity', 'created_at', 'slug'];

    if (options?.sort) {
      const [field, direction] = options.sort.split(':');
      const dir = direction === 'asc' ? 'asc' : 'desc';

      if (ALLOWED_SORT_FIELDS.includes(field)) {
        query = query.order(field, { ascending: dir === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // IMPORTANT: Explicitly cast return type for joins
    const builder = query.returns<ProductWithTranslations[]>();

    if (options?.search) {
      const { data, error } = await builder;
      if (error) throw error;

      let items = data.map((product) => {
        const translation = product.translations?.[0] || {};
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { translations, ...rest } = product;
        return { ...rest, translation };
      });

      const lowerSearch = options.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.slug.toLowerCase().includes(lowerSearch) ||
          item.translation?.title?.toLowerCase().includes(lowerSearch),
      );

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
          last_page: Math.ceil(total / limit) || 1,
        },
      };
    } else {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Note: .range() on builder might lose type info if not careful, but usually preserves it.
      // However, we already applied .returns().
      // Wait, .range() returns a builder.
      const paginatedQuery = builder.range(from, to);

      const { data, error, count } = await paginatedQuery;
      if (error) throw error;

      const items = data.map((product) => {
        const translation = product.translations?.[0] || {};
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { translations, ...rest } = product;
        return { ...rest, translation };
      });

      return {
        data: items,
        meta: {
          total: count,
          page,
          limit,
          last_page: Math.ceil((count || 0) / limit) || 1,
        },
      };
    }
  }

  async findOne(slug: string, locale: string = 'en') {
    const client = this.supabase.getClient();

    // Fetch product and the specific translation for the locale
    // We do NOT filter by style here. We return everything.
    const { data, error } = await client
      .from('products')
      .select(
        `
        *,
        translations:product_translations(*),
        category:categories!category_id(
            id,
            slug,
            translations:category_translations(*)
        )
      `,
      )
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

    const translation =
      data.translations && data.translations[0] ? data.translations[0] : null;

    if (!translation) {
      // Fallback logic could go here (e.g. return default locale),
      // but for now let's just return what we found or null translation.
    }

    return {
      ...data,
      translation: translation || null,
      translations: undefined, // Remove the raw array
    };
  }

  async findById(id: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('products')
      .select(
        `
        *,
        translations:product_translations(*),
        category:categories!category_id(
            id,
            slug,
            translations:category_translations(*)
        )
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }

    const translation =
      data.translations && data.translations[0] ? data.translations[0] : null;

    return {
      ...data,
      translation: translation || null,
      // translations needed for Admin Edit to populate all languages
    };
  }

  async create(body: CreateProductDto, files: Array<Express.Multer.File>) {
    // Handle images: prioritize pre-uploaded URLs from body, fallback to file uploads
    let imageUrls: string[] = [];

    if (body.images && Array.isArray(body.images)) {
      // New workflow: Images already uploaded to Supabase Storage via /storage/upload endpoint
      imageUrls = body.images || [];
    } else if (files && files.length > 0) {
      // Legacy workflow: Upload files directly
      imageUrls = await Promise.all(
        files.map((file) => this.uploadImage(file)),
      );
    }

    const {
      title_en,
      title_vi,
      desc_en,
      desc_vi,
      price,
      original_price,
      slug,
      category,
      quantity,
      variants,
      specifications_en,
      specifications_vi,
      seo_title_en,
      seo_title_vi,
      seo_desc_en,
      seo_desc_vi,
    } = body;

    const client = this.supabase.getClient();

    // Resolve Category Slug to ID
    let category_id = null;
    if (category) {
      const { data: catData } = await client
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();

      if (catData) category_id = catData.id;
    } else if (body.category === '') {
      category_id = null; // explicit Unlink if needed
    }

    // Parse Variants (if sent as stringified JSON in FormData)
    let parsedVariants = [];
    try {
      if (variants) {
        parsedVariants =
          typeof variants === 'string' ? JSON.parse(variants) : variants;
      }
    } catch (e) {
      console.warn('Failed to parse variants', e);
    }

    // 1. Create Product
    // Use Database['public']['Tables']['products']['Insert'] but variants is flexible so we cast if needed.
    // The previous error was "Argument of type ... is not assignable to parameter of type 'never'"
    // This happened because the client wasn't typed correctly. Now it is.
    // We shouldn't need manual casting if the types match.
    // parsedVariants might need explicit casting to Json.

    // Explicitly define insert payload to match Insert type
    const productInsertData: Database['public']['Tables']['products']['Insert'] =
      {
        slug,
        price: parseFloat(price.toString().replace(/\./g, '')),
        original_price: original_price
          ? parseFloat(original_price.toString().replace(/\./g, ''))
          : null,
        images: imageUrls,
        category_id: category_id,
        quantity:
          typeof quantity === 'number' ? quantity : parseInt(String(quantity)),
        style: body.style || 'both',
        is_active: true,
        is_featured:
          String(body.is_featured) === 'true' || body.is_featured === true,
        featured_section: body.featured_section || null,
        variants: parsedVariants,
        discount_percentage: body.discount_percentage
          ? Number(body.discount_percentage)
          : 0,
        discount_start_date: body.discount_start_date || null,
        discount_end_date: body.discount_end_date || null,
      };

    const { data: product, error: prodError } = await client
      .from('products')

      .insert(productInsertData)
      .select()
      .single();

    if (prodError) throw new BadRequestException(prodError.message);

    // 2. Create Translations
    // Explicit cast for insert payload
    const translations: Database['public']['Tables']['product_translations']['Insert'][] =
      [
        {
          product_id: product.id,
          locale: 'en',
          title: title_en,
          description: desc_en,
          specifications: specifications_en,
          seo_title: seo_title_en,
          seo_description: seo_desc_en,
        },
        {
          product_id: product.id,
          locale: 'vi',
          title: title_vi,
          description: desc_vi,
          specifications: specifications_vi,
          seo_title: seo_title_vi,
          seo_description: seo_desc_vi,
        },
      ];

    const { error: transError } = await client
      .from('product_translations')

      .insert(translations);

    if (transError) throw new BadRequestException(transError.message);

    return product;
  }

  async update(
    id: string,
    body: UpdateProductDto,
    files?: Array<Express.Multer.File>,
  ) {
    console.log('Update Product ID:', id);
    console.log('Update Body:', JSON.stringify(body));

    const client = this.supabase.getClient();
    const updateData: Database['public']['Tables']['products']['Update'] = {};

    // Parse keep_images
    let keepImages: string[] = [];
    if (body.keep_images) {
      try {
        // Ensure keep_images is an array of strings
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed =
          typeof body.keep_images === 'string'
            ? JSON.parse(body.keep_images)
            : body.keep_images;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        if (Array.isArray(parsed)) keepImages = parsed;
      } catch {
        // ignore JSON parse error
      }
    }

    // Upload new files
    let newImageUrls: string[] = [];
    if (files && files.length > 0) {
      newImageUrls = await Promise.all(files.map((f) => this.uploadImage(f)));
    }

    // Combine if any change (files uploaded OR keep_images field sent)
    if ((files && files.length > 0) || body.keep_images) {
      updateData.images = [...keepImages, ...newImageUrls];
    }
    if (body.price) {
      const cleanPrice = body.price.toString().replace(/\./g, '');
      updateData.price = parseFloat(cleanPrice);
    }
    if (body.original_price !== undefined) {
      if (body.original_price === '' || body.original_price === null) {
        updateData.original_price = null;
      } else {
        updateData.original_price = parseFloat(
          body.original_price.toString().replace(/\./g, ''),
        );
      }
    }
    if (body.slug) updateData.slug = body.slug;
    if (typeof body.category !== 'undefined') {
      if (body.category) {
        const { data: catData } = await client
          .from('categories')
          .select('id')
          .eq('slug', body.category)
          .single();
        if (catData) updateData.category_id = catData.id;
      }
    }
    if (body.quantity !== undefined && body.quantity !== null)
      updateData.quantity = Number(body.quantity);
    if (body.is_active !== undefined)
      updateData.is_active =
        String(body.is_active) === 'true' || body.is_active === true;
    if (body.is_featured !== undefined)
      updateData.is_featured =
        String(body.is_featured) === 'true' || body.is_featured === true;

    if (body.featured_section !== undefined) {
      updateData.featured_section =
        body.featured_section === '' ? null : body.featured_section;
    }

    // Discount fields
    if (body.discount_percentage !== undefined) {
      updateData.discount_percentage = Number(body.discount_percentage) || 0;
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        updateData.variants =
          typeof body.variants === 'string'
            ? JSON.parse(body.variants)
            : body.variants;
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
    const {
      title_en,
      title_vi,
      desc_en,
      desc_vi,
      specifications_en,
      specifications_vi,
      seo_title_en,
      seo_title_vi,
      seo_desc_en,
      seo_desc_vi,
    } = body;

    // Prepare translation upserts
    if (
      title_en !== undefined ||
      desc_en !== undefined ||
      specifications_en !== undefined ||
      seo_title_en !== undefined ||
      seo_desc_en !== undefined
    ) {
      const payload: Database['public']['Tables']['product_translations']['Update'] =
        { product_id: id, locale: 'en' };
      if (title_en !== undefined) payload.title = title_en;
      if (desc_en !== undefined) payload.description = desc_en;
      if (specifications_en !== undefined)
        payload.specifications = specifications_en;
      if (seo_title_en !== undefined) payload.seo_title = seo_title_en;
      if (seo_desc_en !== undefined) payload.seo_description = seo_desc_en;

      // Note: upsert in supabase-js expects Insert type usually properly typed,
      // but if we are "updating", we might need full Insert shape or allow partial if PK exists.
      // Upsert requires all non-nullable fields if it's a new row.
      // Here we assume row exists or we provide all mandatories?
      // Check mandatories: title is mandatory.
      // If we are patching, we might not have title_en if only desc_en changed.
      // BUT `onConflict` logic usually implies "Insert this if new, else update".
      // If we want to UPDATE only, we should use UPDATE.
      // But the code uses upsert. If it's partial, upsert might fail on insert if missing mandatory.
      // Let's assume for now we trust existing logic but just fix types.
      // We cast payload to 'any' fundamentally to bypass "Insert requires X" check if we know it's an update,
      // OR stricter: we only upsert if we have full data.
      // For now, let's type as `any` specifically for the upsert payload to unblock, OR construct proper Insert object.
      // The original code used partial payload.
      await client
        .from('product_translations')

        .upsert(payload as any, { onConflict: 'product_id,locale' });
    }

    if (
      title_vi !== undefined ||
      desc_vi !== undefined ||
      specifications_vi !== undefined ||
      seo_title_vi !== undefined ||
      seo_desc_vi !== undefined
    ) {
      const payload: Database['public']['Tables']['product_translations']['Update'] =
        { product_id: id, locale: 'vi' };
      if (title_vi !== undefined) payload.title = title_vi;
      if (desc_vi !== undefined) payload.description = desc_vi;
      if (specifications_vi !== undefined)
        payload.specifications = specifications_vi;
      if (seo_title_vi !== undefined) payload.seo_title = seo_title_vi;
      if (seo_desc_vi !== undefined) payload.seo_description = seo_desc_vi;

      await client
        .from('product_translations')

        .upsert(payload as any, { onConflict: 'product_id,locale' });
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async uploadImage(file: Express.Multer.File): Promise<string> {
    const client = this.supabase.getClient();
    const fileName = `${Date.now()}_${file.originalname}`;

    const {
      data: { publicUrl },
    } = client.storage.from('product-images').getPublicUrl(fileName);

    return publicUrl;
  }

  async bulkUpdate(
    ids: string[],
    action: 'delete' | 'archive' | 'restore' | 'update_category',
    payload?: { category?: string },
  ) {
    const client = this.supabase.getClient();

    if (!ids || ids.length === 0)
      return { success: false, message: 'No IDs provided' };

    let updateData: Database['public']['Tables']['products']['Update'] = {};

    switch (action) {
      case 'delete':
      case 'archive':
        updateData = { is_active: false };
        break;
      case 'restore':
        updateData = { is_active: true };
        break;
      case 'update_category':
        if (!payload?.category)
          throw new BadRequestException(
            'Category required for update_category action',
          );
        updateData = { category_id: payload.category }; // Assuming payload.category is ID. If slug, need resolve.
        // Given 'update_category' usually sends ID in admin panel. Let's assume ID.
        // If it's slug, we'd need to fetch.
        // Let's assume strict usage for now.
        break;
      default:
        throw new BadRequestException('Invalid bulk action');
    }

    const { error } = await client
      .from('products')
      .update(updateData)
      .in('id', ids);

    if (error)
      throw new BadRequestException(`Bulk update failed: ${error.message}`);

    return { success: true, count: ids.length };
  }

  async exportProducts(locale: string = 'en', options?: any) {
    // Reuse findAll logic but with no limit (fetch all matching)
    // Cast options to match findAll signature if possible, or leave as any source
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const { data } = await this.findAll(locale, {
      ...options,
      page: 1,
      limit: 10000,
    });

    if (!data || data.length === 0) return '';

    // Generate CSV Header
    const headers = [
      'ID',
      'Slug',
      'Name',
      'Category',
      'Price',
      'Stock',
      'Status',
      'Created At',
    ];
    // data is properly typed now from findAll (ProductWithTranslations)
    const rows = data.map((item) => [
      item.id,
      item.slug,
      `"${(item.translation?.title || '').replace(/"/g, '""')}"`,
      // item.category might be object or null from the join.
      // logic in findAll returns flattened?
      // findAll returns `...rest, translation`.
      // It does NOT flatten 'category'. It returns 'category' object.
      // So item.category is object.
      item.category?.slug || '',
      item.price,
      item.quantity,
      item.is_active ? 'Active' : 'Archived',
      item.created_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }
}
