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
    async findAll(@Query('locale') locale: string, @Query('include_inactive') include_inactive?: string) {
        const validLocale = locale === 'vi' ? 'vi' : 'en';
        return this.productsService.findAll(validLocale, { include_inactive: include_inactive === 'true' });
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
}
