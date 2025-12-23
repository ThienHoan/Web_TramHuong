import { Controller, Get, Param, Query, Post, Body, Patch, Delete, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    async findAll(
        @Query('locale') locale: string,
        @Query('include_inactive') include_inactive?: string,
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('sort') sort?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('stock_status') stock_status?: string,
    ) {
        const validLocale = locale === 'vi' ? 'vi' : 'en';
        return this.productsService.findAll(validLocale, {
            include_inactive: include_inactive === 'true',
            search,
            category,
            sort,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
            stock_status
        });
    }

    @Get(':slug')
    async findOne(@Param('slug') slug: string, @Query('locale') locale: string) {
        const validLocale = locale === 'vi' ? 'vi' : 'en';
        return this.productsService.findOne(slug, validLocale);
    }

    @Get('admin/:id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async findAdminOne(@Param('id') id: string) {
        return this.productsService.findById(id);
    }

    @Post()
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    @UseInterceptors(FileInterceptor('image'))
    async create(
        @Body() body: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) throw new BadRequestException('Image is required');
        return this.productsService.create(body, file);
    }

    @Patch(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    @UseInterceptors(FileInterceptor('image'))
    async update(
        @Param('id') id: string,
        @Body() body: any,
        @UploadedFile() file?: Express.Multer.File
    ) {
        return this.productsService.update(id, body, file);
    }

    @Delete(':id')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async remove(@Param('id') id: string) {
        return this.productsService.softDelete(id);
    }

    @Patch('bulk/update')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async bulkUpdate(@Body() body: { ids: string[], action: 'delete' | 'archive' | 'restore' | 'update_category', payload?: any }) {
        return this.productsService.bulkUpdate(body.ids, body.action, body.payload);
    }

    @Get('data/export')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN, Role.STAFF)
    async exportData(
        @Query('locale') locale: string,
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('stock_status') stock_status?: string,
        @Query('include_inactive') include_inactive?: string,
    ) {
        const validLocale = locale === 'vi' ? 'vi' : 'en';
        const csv = await this.productsService.exportProducts(validLocale, {
            search, category, stock_status, include_inactive: include_inactive === 'true'
        });
        return { csv };
    }
}
