"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let ProductsService = class ProductsService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async findAll(locale = 'en', options) {
        const client = this.supabase.getClient();
        let query = client
            .from('products')
            .select(`
        *,
        quantity,
        translations:product_translations(*)
      `, { count: 'exact' });
        query = query.eq('product_translations.locale', locale);
        if (!options?.include_inactive) {
            query = query.eq('is_active', true);
        }
        if (options?.category) {
            query = query.ilike('category', options.category);
        }
        if (options?.stock_status) {
            if (options.stock_status === 'in_stock') {
                query = query.gt('quantity', 0);
            }
            else if (options.stock_status === 'out_of_stock') {
                query = query.eq('quantity', 0);
            }
            else if (options.stock_status === 'low_stock') {
                query = query.gt('quantity', 0).lt('quantity', 10);
            }
        }
        const ALLOWED_SORT_FIELDS = ['price', 'quantity', 'created_at', 'slug'];
        if (options?.sort) {
            const [field, direction] = options.sort.split(':');
            const dir = direction === 'asc' ? 'asc' : 'desc';
            if (ALLOWED_SORT_FIELDS.includes(field)) {
                query = query.order(field, { ascending: dir === 'asc' });
            }
            else {
                query = query.order('created_at', { ascending: false });
            }
        }
        else {
            query = query.order('created_at', { ascending: false });
        }
        if (options?.search) {
            const { data, error } = await query;
            if (error)
                throw error;
            let items = data.map((product) => {
                const translation = product.translations?.[0] || {};
                const { translations, ...rest } = product;
                return { ...rest, translation };
            });
            const lowerSearch = options.search.toLowerCase();
            items = items.filter(item => item.slug.toLowerCase().includes(lowerSearch) ||
                item.translation?.title?.toLowerCase().includes(lowerSearch));
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
        }
        else {
            const page = options?.page || 1;
            const limit = options?.limit || 20;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
            const { data, error, count } = await query;
            if (error)
                throw error;
            const items = data.map((product) => {
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
    async findOne(slug, locale = 'en') {
        const client = this.supabase.getClient();
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
            throw new common_1.NotFoundException(`Product with slug '${slug}' not found`);
        }
        const translation = data.translations && data.translations[0] ? data.translations[0] : null;
        if (!translation) {
        }
        return {
            ...data,
            translation: translation || null,
            translations: undefined
        };
    }
    async findById(id) {
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
            throw new common_1.NotFoundException(`Product with id '${id}' not found`);
        }
        const translation = data.translations && data.translations[0] ? data.translations[0] : null;
        return {
            ...data,
            translation: translation || null,
        };
    }
    async create(body, file) {
        const imageUrl = await this.uploadImage(file);
        const { title_en, title_vi, desc_en, desc_vi, price, slug, category, quantity } = body;
        const client = this.supabase.getClient();
        const { data: product, error: prodError } = await client
            .from('products')
            .insert({
            slug,
            price: parseFloat(price),
            images: [imageUrl],
            category,
            quantity: quantity ? parseInt(quantity) : 0,
            style: body.style || 'default',
            is_active: true
        })
            .select()
            .single();
        if (prodError)
            throw new common_1.BadRequestException(prodError.message);
        const translations = [
            { product_id: product.id, locale: 'en', title: title_en, description: desc_en },
            { product_id: product.id, locale: 'vi', title: title_vi, description: desc_vi }
        ];
        const { error: transError } = await client
            .from('product_translations')
            .insert(translations);
        if (transError)
            throw new common_1.BadRequestException(transError.message);
        return product;
    }
    async update(id, body, file) {
        const client = this.supabase.getClient();
        let updateData = {};
        if (file) {
            const imageUrl = await this.uploadImage(file);
            updateData.images = [imageUrl];
        }
        if (body.price)
            updateData.price = parseFloat(body.price);
        if (body.slug)
            updateData.slug = body.slug;
        if (body.category)
            updateData.category = body.category;
        if (body.quantity !== undefined && body.quantity !== null)
            updateData.quantity = parseInt(body.quantity);
        if (body.is_active !== undefined)
            updateData.is_active = body.is_active === 'true' || body.is_active === true;
        if (Object.keys(updateData).length > 0) {
            const { error } = await client
                .from('products')
                .update(updateData)
                .eq('id', id);
            if (error) {
                console.error('Update Product Error:', error);
                throw new common_1.BadRequestException(error.message);
            }
        }
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
    async softDelete(id) {
        const client = this.supabase.getClient();
        const { error } = await client
            .from('products')
            .update({ is_active: false })
            .eq('id', id);
        if (error)
            throw new common_1.BadRequestException(error.message);
        return { success: true };
    }
    async uploadImage(file) {
        const client = this.supabase.getClient();
        const fileName = `${Date.now()}_${file.originalname}`;
        const { data, error } = await client.storage
            .from('product-images')
            .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });
        if (error)
            throw new common_1.BadRequestException('Image upload failed: ' + error.message);
        const { data: { publicUrl } } = client.storage
            .from('product-images')
            .getPublicUrl(fileName);
        return publicUrl;
    }
    async bulkUpdate(ids, action, payload) {
        const client = this.supabase.getClient();
        if (!ids || ids.length === 0)
            return { success: false, message: 'No IDs provided' };
        let updateData = {};
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
                    throw new common_1.BadRequestException('Category required for update_category action');
                updateData = { category: payload.category };
                break;
            default:
                throw new common_1.BadRequestException('Invalid bulk action');
        }
        const { error } = await client
            .from('products')
            .update(updateData)
            .in('id', ids);
        if (error)
            throw new common_1.BadRequestException(`Bulk update failed: ${error.message}`);
        return { success: true, count: ids.length };
    }
    async exportProducts(locale = 'en', options) {
        const { data } = await this.findAll(locale, { ...options, page: 1, limit: 10000 });
        if (!data || data.length === 0)
            return '';
        const headers = ['ID', 'Slug', 'Name', 'Category', 'Price', 'Stock', 'Status', 'Created At'];
        const rows = data.map((item) => [
            item.id,
            item.slug,
            `"${(item.translation?.title || '').replace(/"/g, '""')}"`,
            item.category,
            item.price,
            item.quantity,
            item.is_active ? 'Active' : 'Archived',
            item.created_at
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.join(','))
        ].join('\n');
        return csvContent;
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ProductsService);
//# sourceMappingURL=products.service.js.map