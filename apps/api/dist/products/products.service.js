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
    async findAll(locale = 'en') {
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
        return data.map((product) => {
            const translation = product.translations?.[0] || {};
            const { translations, ...rest } = product;
            return {
                ...rest,
                translation
            };
        });
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
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], ProductsService);
//# sourceMappingURL=products.service.js.map