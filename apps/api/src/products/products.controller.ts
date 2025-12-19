import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    async findAll(@Query('locale') locale: string) {
        const validLocale = locale === 'vi' ? 'vi' : 'en';
        return this.productsService.findAll(validLocale);
    }

    @Get(':slug')
    async findOne(@Param('slug') slug: string, @Query('locale') locale: string) {
        // Default to 'en' if not provided, though logic usually handles this.
        const validLocale = locale === 'vi' ? 'vi' : 'en';
        return this.productsService.findOne(slug, validLocale);
    }
}
